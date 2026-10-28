"use client";

import { useMemo } from "react";
import { IconBook, IconHint, IconMap, IconRestart } from "@/components/icons/icons";
import { hintsFor, misconceptionText } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import { replayMoment } from "@/lib/replay";
import { rootLine, rootMatchFor } from "@/lib/root-beliefs";
import { useLab } from "@/lib/store";
import type { WhatIf } from "@/lib/what-if";
import { Button } from "@/components/ui/Button";
import { More } from "@/components/ui/More";
import { ResultCard } from "@/components/ui/ResultCard";
import { LevelProgress } from "./LevelProgress";
import { ExplainSimpler } from "./ExplainSimpler";
import { ReplayPanel } from "./ReplayPanel";
import { TimeScrubber } from "./TimeScrubber";
import { WhatIfResult, WhatIfRow } from "./WhatIf";

/*
 * After the verdict (CLAUDE.md §1, §6.1; DESIGN.md §7.5). Correct: the
 * Result card (both rows ticked), the level ribbon filling, then Next
 * experiment and See the theory. Wrong: the Result card, the belief Ano
 * suspects (and the root idea, once two wrong guesses share one), the 3-step
 * hint ladder, the one small change that breaks it, and the replay that
 * stops at the moment the guess and reality split. Both offer "What if?"
 * variations; a "What if?" run shows its own result instead.
 */

const RUNG = ["Hint", "Why it happened", "Try this"] as const;
const CONFIDENCE = { guess: "Low", fairly: "Medium", certain: "High" } as const;

function answerText(p: { type: "choice"; value: string } | { type: "slider"; value: number } | null): string {
  if (!p) return "No guess";
  return p.type === "choice" ? p.value : String(Math.round(p.value * 100) / 100);
}

export function ResultDock({ nextHref, mapHref, onTheory, onWhatIf, timeScale }: { nextHref: string | null; mapHref: string; onTheory: () => void; onWhatIf: (variant: WhatIf) => void; timeScale: number }) {
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
  const explore = useLab((s) => s.explore);
  const runId = useLab((s) => s.runId);
  const suspected = useProgress((s) => s.suspected);
  const moment = useMemo(() => (def && result && !explore && result.verdict === "wrong" ? replayMoment(def.id, result.outcome, result.diagnosis?.ghost ?? null) : null), [def, result, explore]);
  if (!def || !result) return null;
  if (explore)
    return (
      <div className="flex flex-col gap-4">
        <WhatIfResult onRun={onWhatIf} />
        <TimeScrubber timeScale={timeScale} />
      </div>
    );
  const correct = result.verdict === "correct";
  const card = <ResultCard className="w-full sm:w-72" title={def.title} confidence={CONFIDENCE[confidence]} prediction={answerText(prediction)} reality={answerText(result.outcome.result)} status={correct ? "verified" : "anomaly"} />;

  if (correct) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="animate-pop-in motion-reduce:animate-none">{card}</div>
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button href={nextHref ?? mapHref} size="lg" className="animate-fade-up [animation-delay:200ms] motion-reduce:animate-none">
                {nextHref ? "Next experiment" : "Finish the level"}
              </Button>
              <Button variant="secondary" size="lg" onClick={onTheory} className="animate-fade-up [animation-delay:280ms] motion-reduce:animate-none">
                <IconBook aria-hidden className="size-4" />
                See the theory
              </Button>
            </div>
          </div>
        </div>
        {/* Subtraction pass: everything else waits behind one small More. */}
        <More>
          <LevelProgress />
          <WhatIfRow onRun={onWhatIf} />
          <TimeScrubber timeScale={timeScale} />
          <Button variant="ghost" href={mapHref} transitionTypes={["nav-back"]} className="self-start">
            <IconMap aria-hidden className="size-4" />
            Back to map
          </Button>
        </More>
      </div>
    );
  }

  const focus = result.diagnosis?.focus ?? null;
  const belief = focus ? misconceptionText(focus) : undefined;
  const hints = hintsFor(focus ?? def.misconceptions[0])?.hints;
  const likely = result.diagnosis?.likely === focus && focus !== null;
  const root = rootMatchFor(focus, suspected);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Left: what happened (the card, then the replay that stops where it split). Right: why, and what to try. */}
        <div className="flex flex-col gap-3 sm:w-72 sm:shrink-0">
          <div className="animate-pop-in motion-reduce:animate-none">{card}</div>
        </div>
        <div className="min-w-0 flex-1">
          {/* Ano's diagnosis: worded apart from the student's own "You were sure" chip. */}
          {belief && (
            <p className="mt-2 text-[15px] leading-relaxed text-ink-900">
              {likely ? "This looks like the idea you used:" : "Maybe you used this idea:"} <span className="font-semibold text-anomaly-700">&ldquo;{belief.belief}&rdquo;</span>
            </p>
          )}
          {root && (
            <p data-root-belief={root.root.id} className="mt-2 rounded-tile bg-anomaly-100/60 px-3 py-2 text-[15px] leading-relaxed text-ink-900">
              <span className="font-semibold">Spotted a pattern.</span> {rootLine(root)}
            </p>
          )}
          {hints && hintStep > 0 && (
            <ol className="mt-3 flex flex-col gap-2" aria-label="Hints">
              {hints.slice(0, hintStep).map((hint, i) => (
                <li key={i} className="flex animate-fade-up gap-3 text-[15px] leading-relaxed motion-reduce:animate-none">
                  <span className="type-label mt-1 w-28 shrink-0 text-ink-500">{RUNG[i]}</span>
                  <span>{hint}</span>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {suggestion && (
              <Button onClick={tryConflict} icon={<IconHint aria-hidden className="size-4" />}>
                Try this: {suggestion.edit.label}
              </Button>
            )}
            {hints && hintStep < 3 && (
              <Button variant="secondary" onClick={nextHint}>
                Another hint
              </Button>
            )}
            <Button variant="ghost" onClick={() => build && setBuild(build)}>
              <IconRestart aria-hidden className="size-4" />
              Change something and try again
            </Button>
          </div>
        </div>
      </div>
      {/* Subtraction pass: the replay graph, What if?, Explain it simpler and the scrubber wait behind one small More. The replay still pauses the bench at the split. */}
      <More>
        {moment && <ReplayPanel key={runId} moment={moment} runId={runId} timeScale={timeScale} />}
        {result.diagnosis?.ghost && <p className="text-[14px] text-ink-500">The see-through ghost shows your guess. It sits next to what really happened.</p>}
        {hints && hintStep >= 2 && <ExplainSimpler key={runId} text={hints[1]} />}
        <WhatIfRow onRun={onWhatIf} />
        <TimeScrubber timeScale={timeScale} />
      </More>
    </div>
  );
}
