"use client";

import { useState } from "react";
import { create } from "zustand";
import { useLab, verdictShown } from "@/lib/store";

/*
 * Ask Ano from the lab (CLAUDE.md §7.3): sends only the allowed facts to
 * /api/ask-ano. The server enforces the real limits; the count here is for
 * the button labels, shared by "Ask Ano" and "Explain it simpler" (both use
 * the same five questions). Anything but an AI answer becomes the next
 * written hint, so the student never sees an error.
 */

/** Questions left this session, as the server last reported. */
export const useAskLeft = create<{ left: number }>()(() => ({ left: 5 }));

export type AskMode = "ask" | "simpler";

export interface AskReply {
  text: string;
  /** "ai" or "cache": Ano's own words; "hint": the written fallback. */
  source: "ai" | "cache" | "hint";
}

/** One request to Ask Ano. Null when it couldn't be sent at all (offline, server down). */
export async function askAnoRequest(question: string, mode: AskMode, explain?: string): Promise<AskReply | null> {
  const s = useLab.getState();
  const { def, result, hintStep } = s;
  if (!def) return null;
  const readings = Object.fromEntries(
    Object.entries(result?.outcome.readings ?? {})
      .filter(([, v]) => Number.isFinite(v))
      .slice(0, 16)
      .map(([k, v]) => [k, Math.round(v * 1000) / 1000]),
  );
  try {
    const res = await fetch("/api/ask-ano", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        experimentId: def.id,
        experimentTitle: def.title,
        level: def.level,
        faultCode: result?.outcome.faults[0] ?? null,
        verdict: verdictShown(s),
        focus: result?.diagnosis?.focus ?? def.misconceptions[0] ?? null,
        // "Explain it simpler" falls back to the "why it happened" rung, which explains rather than nudges.
        hintStep: mode === "simpler" ? 1 : Math.min(hintStep, 2),
        readings,
        question: question.trim(),
        mode,
        ...(explain ? { explain: explain.slice(0, 700) } : {}),
      }),
    });
    const data = (await res.json()) as { answer?: string; source?: AskReply["source"]; remaining?: number };
    if (typeof data.remaining === "number") useAskLeft.setState({ left: data.remaining });
    if (!data.answer) return null;
    return { text: data.answer, source: data.source ?? "hint" };
  } catch {
    return null;
  }
}

export function useAskAno() {
  const [answer, setAnswer] = useState<{ runId: number; text: string } | null>(null);
  const left = useAskLeft((s) => s.left);
  const [pending, setPending] = useState(false);

  /** False when there was nothing to send (an empty question), so the form can say so. */
  const ask = async (question: string): Promise<boolean> => {
    if (pending || question.trim().length < 2) return false;
    const lab = useLab.getState();
    // After a wrong guess the hint ladder is on screen: a written fallback opens its next rung there.
    const ladder = verdictShown(lab) === "wrong" && lab.hintStep < 3;
    setPending(true);
    try {
      const reply = await askAnoRequest(question, "ask");
      if (reply && (reply.source !== "hint" || !ladder)) setAnswer({ runId: lab.runId, text: reply.text });
      else {
        lab.nextHint();
        setAnswer(null);
      }
    } finally {
      setPending(false);
    }
    return true;
  };

  return { answer, left, pending, ask };
}
