import "server-only";
import { createHash } from "node:crypto";
import { createGroq } from "@ai-sdk/groq";
import { generateText, type LanguageModel } from "ai";
import { env } from "@/lib/env";
import { citationsFor } from "@/lib/citations";
import { getExperiment } from "@/lib/content";
import { writtenHint } from "./hints";
import { healthRedirect, isPersonalHealthQuestion } from "./safety";
import { ASK_BUDGETS, limits, type LimitStore } from "./limits";
import { buildPrompt, cleanAnswer, contradictsVerdict, SYSTEM_PROMPT, type AskFacts } from "./prompt";

/*
 * Ask Ano (CLAUDE.md §7.3, §7.5): the student's own question, answered by
 * exactly one provider, Groq. No second provider: if Groq is missing, slow,
 * over a limit or says something that contradicts the simulator, the reply is
 * the next written hint. The student never sees an error, and the question
 * is never logged or stored (the cache key is a hash).
 */

export interface AskInput extends AskFacts {
  experimentId: string;
  /** Misconception the hints come from (null before a diagnosis). Not sent to the model. */
  focus: string | null;
  /** Which hint the student would see next (0-based). Not sent to the model. */
  hintStep: number;
}

export type AskSource = "ai" | "cache" | "hint" | "redirect";

export interface AskReply {
  answer: string;
  source: AskSource;
  /** Questions left this session (for the button label). */
  remaining: number;
}

/** Who is asking: a random session id and a hashed IP, never raw personal data. */
export interface Asker {
  sid: string;
  ip: string;
}

const CACHE_SECONDS = 7 * 86_400;

let groq: LanguageModel | null | undefined;

/** The one model for this job, or null when GROQ_API_KEY isn't set. */
export function groqModel(): LanguageModel | null {
  if (groq === undefined) groq = env.GROQ_API_KEY ? createGroq({ apiKey: env.GROQ_API_KEY })(env.GROQ_MODEL) : null;
  return groq;
}

export function normaliseQuestion(question: string): string {
  return question.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function cacheKey(input: AskInput): string {
  const asked = input.explain ? `simpler:${normaliseQuestion(input.explain)}` : normaliseQuestion(input.question);
  const id = `${input.experimentId}|${input.faultCode ?? ""}|${input.verdict ?? ""}|${asked}`;
  return `ask:${createHash("sha256").update(id).digest("hex")}`;
}

/** One model call. Null on any failure or an answer that contradicts the verdict. */
export async function generateAnswer(model: LanguageModel, facts: AskFacts): Promise<string | null> {
  try {
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(facts),
      maxOutputTokens: 220,
      temperature: 0.5,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(9000),
    });
    const answer = cleanAnswer(text);
    if (!answer || contradictsVerdict(answer, facts.verdict)) return null;
    return answer;
  } catch {
    // Errors aren't logged: they can echo the question.
    return null;
  }
}

export async function askAno(
  input: AskInput,
  who: Asker,
  deps: { store: LimitStore; model: LanguageModel | null } = { store: limits(), model: groqModel() },
): Promise<AskReply> {
  const { store, model } = deps;
  const hint = (remaining: number): AskReply => ({ answer: writtenHint(input.focus, input.hintStep), source: "hint", remaining });

  // A question about someone's own health gets the warm redirect, first and always:
  // no model call, no medical information, and it doesn't use up a question.
  if (isPersonalHealthQuestion(input.question)) {
    const left = await store.remaining(ASK_BUDGETS.session, who.sid);
    return { answer: healthRedirect(input.question.length), source: "redirect", remaining: left };
  }

  const left = await store.remaining(ASK_BUDGETS.session, who.sid);
  if (left <= 0) return hint(0);

  const key = cacheKey(input);
  const cached = await store.get(key);
  if (cached) {
    const s = await store.take(ASK_BUDGETS.session, who.sid);
    return { answer: cached, source: "cache", remaining: s.remaining };
  }
  if (!model) return hint(left);

  // Only real model calls count against the per-IP and daily budgets.
  const ip = await store.take(ASK_BUDGETS.ip, who.ip);
  const day = ip.ok ? await store.take(ASK_BUDGETS.global, "all") : { ok: false };
  if (!ip.ok || !day.ok) return hint(left);

  const facts: AskFacts = {
    experimentTitle: input.experimentTitle,
    level: input.level,
    faultCode: input.faultCode,
    verdict: input.verdict,
    readings: input.readings,
    question: input.question,
    explain: input.explain,
    // The experiment's cited claims: the only facts Ano may state (CLAUDE.md Part 2 C).
    claims: citationsFor(getExperiment(input.experimentId)?.citationIds ?? []).map((c) => c.claim),
  };
  const answer = await generateAnswer(model, facts);
  if (!answer) return hint(left);
  await store.set(key, answer, CACHE_SECONDS);
  const s = await store.take(ASK_BUDGETS.session, who.sid);
  return { answer, source: "ai", remaining: s.remaining };
}
