"use client";

import Link from "next/link";
import { BookOpen, RotateCcw, Sparkles } from "lucide-react";
import anoLines from "@/content/ano-lines.json";
import { hintsFor, misconceptionText } from "@/lib/content";
import { cn } from "@/lib/cn";
import { useLab } from "@/lib/store";
import { KineticHeadline } from "./KineticHeadline";
import { TimeScrubber } from "./TimeScrubber";
import { VerdictCard } from "./VerdictCard";

/*
 * After the verdict (CLAUDE.md §1, §6.1, §3.7). Correct: a kinetic headline,
 * your prediction vs the result, then Next experiment and See the theory
 * rising in one after another. Wrong: the same beats in coral, the
 * diagnosed belief, the 3-step hint ladder and the one small change that
 * breaks the belief.
 */

const RUNG = ["Nudge", "Principle", "Fix"] as const;

/** The buttons rise in after the headline and card, one after another. */
const stagger = (i: number) => ({ animationDelay: `${430 + i * 75}ms` });

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
  const prediction = useLab((s) => s.prediction);
  const runId = useLab((s) => s.runId);
  const hintStep = useLab((s) => s.hintStep);
  const nextHint = useLab((s) => s.nextHint);
  const suggestion = useLab((s) => s.conflict);
  const tryConflict = useLab((s) => s.tryConflict);
  const setBuild = useLab((s) => s.setBuild);
  const build = useLab((s) => s.build);
  if (!def || !result) return null;

  const pill = "inline-flex min-h-11 animate-rise-in items-center gap-2 rounded-full px-4 py-2.5 text-[15px] transition-[background-color,color,transform] duration-200 ease-lab active:scale-[0.97]";
  const primary = "bg-linear-to-r from-ion-600 to-ion-400 text-mist-100 hover:to-glow-400";
  const card = <VerdictCard predicted={prediction ? answerText(prediction) : "—"} actual={answerText(result.outcome.result)} correct={result.verdict === "correct"} />;

  if (result.verdict === "correct") {
    const headlines = anoLines.headlines.correct;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <KineticHeadline text={headlines[runId % headlines.length]} tone="correct" />
            {card}
          </div>
          <div className="flex flex-wrap gap-2">
            {nextHref ? (
              <Link href={nextHref} className={cn(pill, primary)} style={stagger(0)}>
                Next experiment
              </Link>
            ) : (
              <Link href={mapHref} className={cn(pill, "bg-linear-to-r from-resolve-600 to-resolve-300 text-void")} style={stagger(0)}>
                Finish the level
              </Link>
            )}
            <button type="button" onClick={onTheory} className={cn(pill, "glass text-pearl hover:bg-pearl/15")} style={stagger(1)}>
              <BookOpen className="size-4" strokeWidth={1.8} />
              See the theory
            </button>
            <Link href={mapHref} className={cn(pill, "text-pearl/70 hover:bg-pearl/10 hover:text-pearl")} style={stagger(2)}>
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
  const headlines = anoLines.headlines.wrong;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <KineticHeadline text={headlines[runId % headlines.length]} tone="wrong" />
            {card}
          </div>
          <p className="mt-3 text-[14px] text-mist-400">The dashed ghost shows what your idea predicted.</p>
          {belief && (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-pearl/85">
              {likely ? "Ano is fairly sure" : "Ano thinks"} you might be using this idea:{" "}
              <span className="text-lilac">&ldquo;{belief.belief}&rdquo;</span>
            </p>
          )}
          {hints && hintStep > 0 && (
            <ol className="mt-4 flex flex-col gap-2">
              {hints.slice(0, hintStep).map((hint, i) => (
                <li key={i} className="flex animate-hud-in gap-3 text-[15px] leading-relaxed">
                  <span className="type-label mt-1 w-20 shrink-0 text-pearl/45">{RUNG[i]}</span>
                  <span className="text-pearl">{hint}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="flex flex-wrap gap-2 lg:max-w-xs lg:flex-col lg:items-stretch">
          {suggestion && (
            <button type="button" onClick={tryConflict} className={cn(pill, primary, "justify-center")} style={stagger(0)}>
              <Sparkles className="size-4" strokeWidth={1.8} />
              Try this: {suggestion.edit.label}
            </button>
          )}
          {hints && hintStep < 3 && (
            <button type="button" onClick={nextHint} className={cn(pill, "justify-center glass text-pearl hover:bg-pearl/15")} style={stagger(1)}>
              Another hint
            </button>
          )}
          <button type="button" onClick={() => build && setBuild(build)} className={cn(pill, "justify-center text-pearl/70 hover:bg-pearl/10 hover:text-pearl")} style={stagger(2)}>
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
