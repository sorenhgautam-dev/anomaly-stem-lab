import { diagnose } from "@/engine/diagnose";
import { initialBuild } from "@/engine/edits";
import { matches } from "@/engine/match";
import { simulateOutcome } from "@/engine/outcome";
import { realModel } from "@/engine/registry";
import { sample } from "@/components/lab/playback";
import { getExperiment, misconceptionText } from "@/lib/content";

/*
 * How it works (DESIGN.md §7.1 item 2) as one live sequence from the real
 * chemo experiment, run through the engine: Guess, Run, Reveal, Understand.
 * Every number on the bench and every answer comes from the simulator; the
 * guess is the common wrong one ("Nothing happens to them"). Pure and
 * deterministic, so it runs once on the server.
 */

export interface HowBench {
  /** Each dish's cells, % of the start (teaching-model values). */
  dishes: { cancer: number; hair: number; slow: number };
  /** The student's idea for the hair dish (Reveal only). */
  ghostHair: number | null;
  /** The real answer, once there's a run, and the guess's answer beside it. */
  run: { answer: string } | null;
  ghost: { answer: string } | null;
  verdict: "correct" | "wrong" | null;
  /** One short label on the bench. */
  tag: string;
}

export interface HowSequence {
  question: string;
  guess: string;
  steps: HowBench[];
}

const CHEMO = "treatment-chemo-hair";

export function howSequence(): HowSequence {
  const def = getExperiment(CHEMO);
  if (!def || def.prediction.type !== "choice") throw new Error("How it works needs the chemo experiment");
  const build = initialBuild(def);
  const guess = "Nothing happens to them";
  const prediction = { type: "choice" as const, value: guess };
  const real = simulateOutcome(def, build, realModel(def.stage));
  const right = matches(def.prediction, prediction, real.result);
  const found = right ? null : diagnose(def, build, prediction, {});
  const at = (t: number) => sample(real.timeline, t);
  const mid = (real.readings["treat.start"] + real.readings["treat.end"]) / 2;
  const low = real.timeline!.reduce((a, f) => (f.values.hair < a.values.hair ? f : a));
  const end = real.timeline![real.timeline!.length - 1].values;
  const dish = (v: Record<string, number>) => ({ cancer: v.cancer, hair: v.hair, slow: v.slow });
  const belief = found?.focus ? misconceptionText(found.focus)?.title : null;
  return {
    question: def.prediction.question,
    guess,
    steps: [
      { dishes: dish(at(0)), ghostHair: null, run: null, ghost: null, verdict: null, tag: `Your guess: ${guess}` },
      { dishes: dish(at(mid)), ghostHair: null, run: null, ghost: null, verdict: null, tag: "Chemo on" },
      { dishes: dish(low.values), ghostHair: found?.ghost ? sample(found.ghost.timeline, low.t).hair : null, run: { answer: String(real.result.value) }, ghost: { answer: guess }, verdict: right ? "correct" : "wrong", tag: belief ? `Your idea: ${belief}` : "Your idea" },
      { dishes: dish(end), ghostHair: null, run: { answer: String(real.result.value) }, ghost: null, verdict: null, tag: "Treatment over: the hair cells refill" },
    ],
  };
}
