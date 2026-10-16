"use client";

import Link from "next/link";
import { BookOpen, RotateCcw, Sparkles } from "lucide-react";
import { hintsFor, misconceptionText } from "@/lib/content";
import { cn } from "@/lib/cn";
import { useLab } from "@/lib/store";
import { TimeScrubber } from "./TimeScrubber";

/*
 * After the verdict (CLAUDE.md §1, §6.1).
 * Correct: congratulations + Next experiment + See the theory.
 * Wrong: the diagnosed belief, the 3-step hint ladder, and the one small
 * change that breaks the belief.
 */

const RUNG = ["Nudge", "Principle", "Fix"] as const;

export function ResultPanel({
  nextHref,
  mapHref,
  onTheory,
  timeScale,
}: {
  nextHref: string | null;
  mapHref: string;
  onTheory: () => void;
  timeScale: number;
}) {
  const def = useLab((s) => s.def);
  const result = useLab((s) => s.result);
  const hintStep = useLab((s) => s.hintStep);
  const nextHint = useLab((s) => s.nextHint);
  const suggestion = useLab((s) => s.conflict);
  const tryConflict = useLab((s) => s.tryConflict);
  const setBuild = useLab((s) => s.setBuild);
  const build = useLab((s) => s.build);
  if (!def || !result) return null;

  const pill = "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[15px] transition-colors duration-200 ease-lab";

  if (result.verdict === "correct") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="type-headline text-[clamp(2rem,4vw,3.25rem)] text-resolve">
              Nailed <span className="type-accent">it.</span>
            </p>
            <p className="mt-1 text-[15px] text-pearl/70">
              Your prediction matched the simulator: <span className="text-pearl">{answerText(result.outcome.result)}</span>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {nextHref ? (
              <Link href={nextHref} className={cn(pill, "bg-pearl text-void hover:bg-white")}>
                <span aria-hidden className="size-1.5 rounded-full bg-signal" />
                Next experiment
              </Link>
            ) : (
              <Link href={mapHref} className={cn(pill, "bg-resolve text-void")}>
                <span aria-hidden className="size-1.5 rounded-full bg-void" />
                Finish the level
              </Link>
            )}
            <button type="button" onClick={onTheory} className={cn(pill, "glass text-pearl hover:bg-pearl/15")}>
              <BookOpen className="size-4" strokeWidth={1.8} />
              See the theory
            </button>
            <Link href={mapHref} className={cn(pill, "text-pearl/70 hover:bg-pearl/10 hover:text-pearl")}>
              Back to map
            </Link>
          </div>
        </div>
        <TimeScrubber timeScale={timeScale} />
      </div>
    );
  }

  const diagnosis = result.diagnosis;
  const focus = diagnosis?.focus ?? null;
  const belief = focus ? misconceptionText(focus) : undefined;
  const hints = hintsFor(focus ?? def.misconceptions[0])?.hints;
  const likely = diagnosis?.likely === focus && focus !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <p className="type-headline text-[clamp(2rem,4vw,3.25rem)] text-anomaly">
            Not quite<span className="type-accent">.</span>
          </p>
          <p className="mt-1 text-[15px] text-pearl/70">
            Reality: <span className="text-pearl">{answerText(result.outcome.result)}</span>. You predicted something else, and the
            dashed ghost shows it.
          </p>
          {belief && (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-pearl/85">
              {likely ? "Ano is fairly sure" : "Ano thinks"} you might be using this idea:{" "}
              <span className="text-lilac">&ldquo;{belief.belief}&rdquo;</span>
            </p>
          )}
          {hints && hintStep > 0 && (
            <ol className="mt-4 flex flex-col gap-2">
              {hints.slice(0, hintStep).map((hint, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="type-label mt-1 w-20 shrink-0 text-pearl/45">{RUNG[i]}</span>
                  <span className="text-pearl">{hint}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="flex flex-wrap gap-2 lg:max-w-xs lg:flex-col lg:items-stretch">
          {suggestion && (
            <button type="button" onClick={tryConflict} className={cn(pill, "justify-center bg-pearl text-void hover:bg-white")}>
              <Sparkles className="size-4" strokeWidth={1.8} />
              Try this: {suggestion.edit.label}
            </button>
          )}
          {hints && hintStep < 3 && (
            <button type="button" onClick={nextHint} className={cn(pill, "justify-center glass text-pearl hover:bg-pearl/15")}>
              Another hint
            </button>
          )}
          <button
            type="button"
            onClick={() => build && setBuild(build)}
            className={cn(pill, "justify-center text-pearl/70 hover:bg-pearl/10 hover:text-pearl")}
          >
            <RotateCcw className="size-4" strokeWidth={1.8} />
            Change something and run again
          </button>
        </div>
      </div>
      <TimeScrubber timeScale={timeScale} />
    </div>
  );
}

function answerText(p: { type: "choice"; value: string } | { type: "slider"; value: number }): string {
  return p.type === "choice" ? p.value : String(Math.round(p.value * 100) / 100);
}
