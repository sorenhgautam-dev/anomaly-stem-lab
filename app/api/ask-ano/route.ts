import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { buildPrompt, contradictsVerdict, SYSTEM_PROMPT } from "@/lib/ask-ano/prompt";
import { askProviders } from "@/lib/ask-ano/providers";

/*
 * Ask Ano: the ONLY place AI is called (CLAUDE.md §2, §7.3).
 *  - 5 questions per session (anonymous random cookie, no personal data).
 *  - Cached by (experimentId, faultCode, normalised question). The cache key
 *    is a hash, so the question itself is never stored or logged.
 *  - Providers in order (lib/ask-ano/providers.ts); if all fail, the client
 *    shows the next written hint instead (source "fallback").
 */

const CAP = 5;
const COOKIE = "ano_sid";

const sessions = new Map<string, number>();
const cache = new Map<string, string>();
const MAX_SESSIONS = 5000;
const MAX_CACHE = 500;

const body = z.object({
  experimentId: z.string().regex(/^[a-z0-9-]{1,64}$/),
  experimentTitle: z.string().min(1).max(80),
  faultCode: z.string().max(64).nullable(),
  verdict: z.enum(["correct", "wrong"]).nullable(),
  readings: z
    .record(z.string().regex(/^[a-zA-Z0-9.-]{1,40}$/), z.number().finite())
    .refine((r) => Object.keys(r).length <= 16, "too many readings"),
  question: z.string().trim().min(2).max(300),
});

function normalise(question: string): string {
  return question.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function remember<K, V>(map: Map<K, V>, key: K, value: V, max: number) {
  map.delete(key);
  map.set(key, value);
  if (map.size > max) map.delete(map.keys().next().value as K);
}

export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const facts = parsed.data;

  const sid = request.cookies.get(COOKIE)?.value ?? randomUUID();
  const used = sessions.get(sid) ?? 0;
  const respond = (payload: { answer: string | null; source: string; remaining: number }, status = 200) => {
    const res = NextResponse.json(payload, { status });
    res.cookies.set({ name: COOKIE, value: sid, httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 6 });
    return res;
  };

  if (used >= CAP) return respond({ answer: null, source: "cap", remaining: 0 }, 429);
  // Only answers count toward the cap; a written-hint fallback is free.
  const answered = () => {
    remember(sessions, sid, used + 1, MAX_SESSIONS);
    return CAP - used - 1;
  };

  const key = createHash("sha256")
    .update(`${facts.experimentId}|${facts.faultCode ?? ""}|${facts.verdict ?? ""}|${normalise(facts.question)}`)
    .digest("hex");
  const cached = cache.get(key);
  if (cached) return respond({ answer: cached, source: "cache", remaining: answered() });

  const reply = await askProviders(SYSTEM_PROMPT, buildPrompt(facts));
  if (!reply || contradictsVerdict(reply.text, facts.verdict)) {
    return respond({ answer: null, source: "fallback", remaining: CAP - used });
  }
  remember(cache, key, reply.text, MAX_CACHE);
  return respond({ answer: reply.text, source: reply.provider, remaining: answered() });
}
