"use client";

import { useState, type FormEvent } from "react";
import { IconAsk, IconClose } from "@/components/icons/icons";
import anoLines from "@/content/ano-lines.json";
import { hintsFor } from "@/lib/content";
import { cn } from "@/lib/cn";
import { useProgress } from "@/lib/progress";
import { replayLine } from "@/lib/replay";
import { rootLine, rootMatchFor } from "@/lib/root-beliefs";
import { useLab } from "@/lib/store";
import { whatIfLine } from "@/lib/what-if";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { useAskAno } from "./useAskAno";
import { useReplayState } from "./useReplay";
import { useLabDef } from "./lab-def";

/*
 * Ano's speech bubble in the lab (DESIGN.md §7.5 bottom left): one short
 * line per moment (CLAUDE.md §7), and Ask Ano for the student's own
 * question (capped, with written-hint fallback). Hints and the goal are in
 * the panels; the bubble never repeats them. It sits bottom left, under Ano.
 */

const pick = (lines: string[], seed: number) => lines[seed % lines.length];

function useLine(answer: string | null): string {
  const def = useLabDef();
  const ano = useLab((s) => s.ano);
  const phase = useLab((s) => s.phase);
  const prediction = useLab((s) => s.prediction);
  const result = useLab((s) => s.result);
  const runId = useLab((s) => s.runId);
  const confidence = useLab((s) => s.confidence);
  const hintStep = useLab((s) => s.hintStep);
  const explore = useLab((s) => s.explore);
  const suspected = useProgress((s) => s.suspected);
  const replay = useReplayState();
  if (!def) return "";
  if (answer) return answer;
  const hints = hintsFor(result?.diagnosis?.focus ?? def.misconceptions[0])?.hints;
  if (phase === "running") return explore ? `${explore.variant.label}. Let's see what happens.` : "Here we go. Watch closely.";
  // A "What if?" result: Ano reacts with the real change between the two runs.
  if (explore && result) return whatIfLine(explore.variant, explore.before, result.outcome.readings);
  // The replay stopped where the guess and reality split: one short line pointing at it.
  if (ano === "wrong" && replay.status === "paused" && replay.moment) return replayLine(replay.moment, result?.outcome.readings.timeScale ?? 1);
  if (ano === "greet") return def.intro;
  if (ano === "correct") return `${pick(anoLines.correct, runId)}${confidence === "guess" ? " Lucky guess or smart guess? Now you know why." : ""}${result && !result.goalMet ? " The goal isn’t done yet, though." : ""}`;
  // Hints live in the result panel; Ano's bubble keeps to one short line of his own, so nothing is said twice.
  if (ano === "wrong") {
    // Two or more wrong guesses from one root idea: say so in plain words.
    const root = rootMatchFor(result?.diagnosis?.focus ?? null, suspected);
    return root ? rootLine(root) : pick(anoLines.wrong, runId);
  }
  // Another hint: Ano asks this idea's own guiding question (the panel holds the fuller hint, so nothing is said twice).
  if (ano === "stuck" && hints && hintStep > 0) return hintsFor(result?.diagnosis?.focus ?? def.misconceptions[0])?.ask ?? pick(anoLines.stuck, hintStep);
  return prediction ? "Locked in. Press Run when you're ready." : pick(anoLines.building, runId);
}

export function AnoDock({ className }: { className?: string }) {
  const phase = useLab((s) => s.phase);
  const runId = useLab((s) => s.runId);
  const { answer, left, pending, ask } = useAskAno();
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const shown = answer && answer.runId === runId ? answer.text : null;
  const line = useLine(shown);

  const [empty, setEmpty] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // An empty question stays open with a friendly nudge instead of vanishing.
    if (!(await ask(question))) {
      setEmpty(true);
      return;
    }
    setEmpty(false);
    setQuestion("");
    setAsking(false);
  };

  return (
    <div data-lab-ano-dock className={cn("group/dock", className)}>
      <SpeechBubble text={line} fromAi={!!shown} tail="top" tailClassName="transition-opacity duration-300 group-data-away/dock:opacity-0">
        {phase !== "running" &&
          (asking ? (
            <form onSubmit={submit} className="flex w-full flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="ask-ano">
                Your question for Ano
              </label>
              <input id="ask-ano" autoFocus value={question} maxLength={300} aria-describedby={empty ? "ask-ano-empty" : undefined} onChange={(e) => { setQuestion(e.target.value); setEmpty(false); }} placeholder="Why did that happen?" className="h-11 min-w-0 flex-1 rounded-full border border-ink-900/10 bg-cream-50 px-4 text-[15px] text-ink-900 placeholder:text-ink-500" />
              <Button type="submit" disabled={pending}>
                {pending ? "…" : "Ask"}
              </Button>
              <IconButton label="Close" size="sm" onClick={() => setAsking(false)}>
                <IconClose />
              </IconButton>
              {empty && (
                <p id="ask-ano-empty" role="status" className="basis-full text-[13px] text-ink-700">
                  Type a question first, like &ldquo;Why did it change?&rdquo;
                </p>
              )}
            </form>
          ) : (
            <Button variant="ghost" disabled={left <= 0} onClick={() => setAsking(true)} className="bg-cream-100">
              <IconAsk aria-hidden className="size-4" />
              Ask Ano · {left} left
            </Button>
          ))}
        {phase !== "running" && !asking && left <= 0 && (
          <p role="status" className="text-[13px] text-ink-700">
            You&rsquo;ve used all 5 questions for now. The hints still work.
          </p>
        )}
      </SpeechBubble>
    </div>
  );
}
