"use client";

import { useState } from "react";
import { useLab } from "@/lib/store";

/*
 * Ask Ano from the lab (CLAUDE.md §7.3): sends only the allowed facts to
 * /api/ask-ano. The server enforces the real limits; the count here is for
 * the button label. Anything but an AI answer becomes the next written hint.
 */

export function useAskAno() {
  const [answer, setAnswer] = useState<{ runId: number; text: string } | null>(null);
  const [left, setLeft] = useState(5);
  const [pending, setPending] = useState(false);

  const ask = async (question: string): Promise<void> => {
    const s = useLab.getState();
    const { def, result, phase, runId, hintStep } = s;
    if (!def || pending || question.trim().length < 2) return;
    setPending(true);
    try {
      const readings = Object.fromEntries(
        Object.entries(result?.outcome.readings ?? {})
          .filter(([, v]) => Number.isFinite(v))
          .slice(0, 16)
          .map(([k, v]) => [k, Math.round(v * 1000) / 1000]),
      );
      const res = await fetch("/api/ask-ano", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          experimentId: def.id,
          experimentTitle: def.title,
          level: def.level,
          faultCode: result?.outcome.faults[0] ?? null,
          verdict: phase === "result" && result ? result.verdict : null,
          focus: result?.diagnosis?.focus ?? def.misconceptions[0] ?? null,
          hintStep: Math.min(hintStep, 2),
          readings,
          question: question.trim(),
        }),
      });
      const data = (await res.json()) as { answer?: string; source?: string; remaining?: number };
      if (typeof data.remaining === "number") setLeft(data.remaining);
      if (data.answer && data.source !== "hint") setAnswer({ runId, text: data.answer });
      else {
        s.nextHint();
        setAnswer(null);
      }
    } catch {
      s.nextHint();
    } finally {
      setPending(false);
    }
  };

  return { answer, left, pending, ask };
}
