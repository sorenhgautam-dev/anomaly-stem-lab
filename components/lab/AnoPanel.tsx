"use client";

import { useState, type FormEvent } from "react";
import { MessageCircleQuestion, X } from "lucide-react";
import anoLines from "@/content/ano-lines.json";
import { hintsFor } from "@/lib/content";
import { cn } from "@/lib/cn";
import { useLab } from "@/lib/store";
import { AnoOrb } from "./AnoOrb";

/*
 * Ano beside the experiment: one short line for each moment (CLAUDE.md §7),
 * plus "Ask Ano" for the student's own question (the only AI call, capped at
 * 5 per session). If the AI can't answer, Ano gives the next written hint.
 */

function pick(lines: string[], seed: number): string {
  return lines[seed % lines.length];
}

export function AnoPanel({ className }: { className?: string }) {
  const def = useLab((s) => s.def);
  const ano = useLab((s) => s.ano);
  const phase = useLab((s) => s.phase);
  const prediction = useLab((s) => s.prediction);
  const result = useLab((s) => s.result);
  const runId = useLab((s) => s.runId);
  const confidence = useLab((s) => s.confidence);
  const hintStep = useLab((s) => s.hintStep);
  const nextHint = useLab((s) => s.nextHint);
  const [answer, setAnswer] = useState<{ runId: number; text: string } | null>(null);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [left, setLeft] = useState(5);
  const [pending, setPending] = useState(false);

  // An answer belongs to the run it was asked about; the box closes while a run plays.
  const shownAnswer = answer && answer.runId === runId ? answer.text : null;
  const askOpen = asking && phase !== "running";

  if (!def) return null;
  const focus = result?.diagnosis?.focus ?? def.misconceptions[0];
  const hints = focus ? hintsFor(focus)?.hints : undefined;

  let line: string;
  if (phase === "running") line = "Here we go. Watch closely.";
  else if (ano === "greet") line = def.intro;
  else if (ano === "correct") {
    line = pick(anoLines.correct, runId);
    if (confidence === "guess") line += " Lucky or sharp? Either way, now you know why.";
    if (result && !result.goalMet) line += ` The goal isn't met yet, though: ${def.goal}`;
  } else if (ano === "wrong") {
    line = pick(anoLines.wrong, runId);
    if (confidence === "certain") line += " Being sure and wrong is the best kind of surprise.";
  } else if (ano === "stuck" && hints && hintStep > 0) line = hints[hintStep - 1];
  else line = prediction ? "Locked in. Press Run when you're ready." : pick(anoLines.building, runId);

  const ask = async (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 2 || pending) return;
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
          faultCode: result?.outcome.faults[0] ?? null,
          verdict: phase === "result" && result ? result.verdict : null,
          readings,
          question: q,
        }),
      });
      const data = (await res.json()) as { answer: string | null; remaining?: number };
      if (typeof data.remaining === "number") setLeft(data.remaining);
      if (data.answer) setAnswer({ runId, text: data.answer });
      else {
        // No AI available: the next written hint instead (CLAUDE.md §2).
        nextHint();
        setAnswer(null);
      }
      setQuestion("");
      setAsking(false);
    } catch {
      nextHint();
      setAsking(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <aside className={cn("flex items-start gap-3", className)} aria-live="polite">
      <AnoOrb mood={ano} size={56} />
      <div className="glass min-w-0 flex-1 rounded-[18px] p-4">
        <p className="type-label flex items-center gap-2 text-lilac">Ano</p>
        <p className="mt-2 text-[15px] leading-[1.45] tracking-[-0.01em] text-pearl">{shownAnswer ?? line}</p>
        {askOpen ? (
          <form onSubmit={ask} className="mt-3 flex items-center gap-2">
            <label className="sr-only" htmlFor="ask-ano">
              Your question for Ano
            </label>
            <input
              id="ask-ano"
              autoFocus
              value={question}
              maxLength={300}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Why did that happen?"
              className="min-w-0 flex-1 rounded-full border border-pearl/15 bg-void/60 px-3.5 py-2 text-[14px] text-pearl placeholder:text-pearl/35"
            />
            <button type="submit" disabled={pending} className="type-label rounded-full bg-pearl px-3.5 py-2.5 text-void disabled:opacity-50">
              {pending ? "…" : "Ask"}
            </button>
            <button type="button" onClick={() => setAsking(false)} className="grid size-8 place-items-center rounded-full text-pearl/60 hover:bg-pearl/10" aria-label="Close">
              <X className="size-4" />
            </button>
          </form>
        ) : (
          phase !== "running" && (
            <button
              type="button"
              disabled={left <= 0}
              onClick={() => setAsking(true)}
              className="type-label mt-3 inline-flex items-center gap-2 rounded-full px-3 py-2 text-pearl/70 transition-colors hover:bg-pearl/10 hover:text-pearl disabled:opacity-40"
            >
              <MessageCircleQuestion className="size-3.5" strokeWidth={1.8} />
              Ask Ano · {left} left
            </button>
          )
        )}
      </div>
    </aside>
  );
}
