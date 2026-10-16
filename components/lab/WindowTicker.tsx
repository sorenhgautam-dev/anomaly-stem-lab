"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { useLab } from "@/lib/store";
import { playback } from "./playback";

/*
 * A small instrument ticker in the window's corner (CLAUDE.md §3.6.3): which
 * station you're at, the run clock while it plays, then the verdict. The
 * clock is written straight to the DOM from the playback loop. Decorative:
 * the mission bar already announces each step.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function WindowTicker() {
  const def = useLab((s) => s.def);
  const phase = useLab((s) => s.phase);
  const result = useLab((s) => s.result);
  const runId = useLab((s) => s.runId);
  const clock = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (phase !== "running") return;
    return playback.onFrame((t) => {
      if (clock.current) clock.current.textContent = `t ${t.toFixed(2)} s`;
    });
  }, [phase]);

  if (!def) return null;
  const station = `${def.lab === "chemistry" ? "Hood" : "Bench"} ${pad(def.order)} · ${def.stage}`;
  const verdict = phase === "result" ? result?.verdict : null;

  return (
    <p aria-hidden className="pointer-events-none absolute bottom-3.5 left-5 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-mist-400/80">
      <span
        className={cn(
          "size-1.5 rounded-full",
          verdict === "correct" ? "bg-resolve-400" : verdict === "wrong" ? "bg-anomaly-400" : phase === "running" ? "animate-pulse bg-ion-300" : "bg-glow-400",
        )}
      />
      <span>{station}</span>
      <span className="text-mist-600">/</span>
      {phase === "running" ? (
        <span>
          Run {pad(runId)} · <span ref={clock}>t 0.00 s</span>
        </span>
      ) : verdict ? (
        <span className={verdict === "correct" ? "text-resolve-300" : "text-anomaly-300"}>{verdict === "correct" ? "Match" : "Anomaly"}</span>
      ) : (
        <span>Ready</span>
      )}
    </p>
  );
}
