"use client";

import { ArrowRight, BookOpen, Map, RotateCcw, Sparkles } from "lucide-react";
import { hintsFor, misconceptionText } from "@/lib/content";
import { useLab } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { ResultCard } from "@/components/ui/ResultCard";
import { LevelProgress } from "./LevelProgress";
import { TimeScrubber } from "./TimeScrubber";

/*
 * After the verdict (CLAUDE.md §1, §6.1; DESIGN.md §7.5). Correct: the
 * Result card (both rows ticked), the level ribbon filling, then Next
 * experiment and See the theory. Wrong: the Result card, the belief Ano
 * suspects, the 3-step hint ladder and the one small change that breaks it.
 */

const RUNG = ["Nudge", "Principle", "Fix"] as const;
const CONFIDENCE = { guess: "Low", fairly: "Medium", certain: "High" } as const;

function answerText(p: { type: "choice"; value: string } | { type: "slider"; value: number } | null): string {
  if (!p) return "—";
  return p.type === "choice" ? p.value : String(Math.round(p.value * 100) / 100);
}

export function ResultDock({ nextHref, mapHref, onTheory, timeScale }: { nextHref: string | null; mapHref: string; onTheory: () => void; timeScale: number }) {
  const def = useLab((s) => s.def);
  const result = useLab((s) => s.result);
  const prediction = useLab((s) => s.prediction);
  const confidence = useLab((s) => s.confidence);
  const hintStep = useLab((s) => s.hintStep);
  const nextHint = useLab((s) => s.nextHint);
  const suggestion = useLab((s) => s.conflict);
  const tryConflict = useLab((s) => s.tryConflict);
  const build = useLab((s) => s.build);
  const setBuild = useLab((s) => s.setBuild);
  if (!def || !result) return null;
  const correct = result.verdict === "correct";
  const card = <ResultCard className="w-full sm:w-72" title={def.title} confidence={CONFIDENCE[confidence]} prediction={answerText(prediction)} reality={answerText(result.outcome.result)} status={correct ? "verified" : "anomaly"} />;

  if (correct) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="animate-pop-in motion-reduce:animate-none">{card}</div>
          <div className="flex flex-1 flex-col gap-3">
            <LevelProgress />
            <div className="flex flex-wrap gap-2">
              <Button href={nextHref ?? mapHref} size="lg" icon={<ArrowRight aria-hidden className="size-4" />} className="animate-fade-up [animation-delay:200ms] motion-reduce:animate-none">
                {nextHref ? "Next experiment" : "Finish the level"}
              </Button>
              <Button variant="secondary" size="lg" onClick={onTheory} className="animate-fade-up [animation-delay:280ms] motion-reduce:animate-none">
                <BookOpen aria-hidden className="size-4" />
                See the theory
              </Button>
              <Button variant="ghost" href={mapHref} transitionTypes={["nav-back"]} className="animate-fade-up [animation-delay:360ms] motion-reduce:animate-none">
                <Map aria-hidden className="size-4" />
                Back to map
              </Button>
            </div>
          </div>
        </div>
        <TimeScrubber timeScale={timeScale} />
      </div>
    );
  }

  const focus = result.diagnosis?.focus ?? null;
  const belief = focus ? misconceptionText(focus) : undefined;
  const hints = hintsFor(focus ?? def.misconceptions[0])?.hints;
  const likely = result.diagnosis?.likely === focus && focus !== null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="animate-pop-in motion-reduce:animate-none">{card}</div>
        <div className="min-w-0 flex-1">
          {result.diagnosis?.ghost && <p className="text-[14px] text-ink-500">The dashed blue ghost shows what your idea predicted, beside what really happened.</p>}
          {belief && (
            <p className="mt-2 text-[15px] leading-relaxed text-ink-900">
              {likely ? "Ano is fairly sure" : "Ano thinks"} you might be using this idea: <span className="font-semibold text-anomaly-700">&ldquo;{belief.belief}&rdquo;</span>
            </p>
          )}
          {hints && hintStep > 0 && (
            <ol className="mt-3 flex flex-col gap-2" aria-label="Hints">
              {hints.slice(0, hintStep).map((hint, i) => (
                <li key={i} className="flex animate-fade-up gap-3 text-[15px] leading-relaxed motion-reduce:animate-none">
                  <span className="type-eyebrow mt-1 w-20 shrink-0 text-ink-500">{RUNG[i]}</span>
                  <span>{hint}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestion && (
              <Button onClick={tryConflict} icon={<Sparkles aria-hidden className="size-4" />}>
                Try this: {suggestion.edit.label}
              </Button>
            )}
            {hints && hintStep < 3 && (
              <Button variant="secondary" onClick={nextHint}>
                Another hint
              </Button>
            )}
            <Button variant="ghost" onClick={() => build && setBuild(build)}>
              <RotateCcw aria-hidden className="size-4" />
              Change something and run again
            </Button>
          </div>
        </div>
      </div>
      <TimeScrubber timeScale={timeScale} />
    </div>
  );
}
