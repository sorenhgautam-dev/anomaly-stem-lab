import { initialBuild } from "@/engine/edits";
import { runExperiment } from "@/engine/run";
import type { ExperimentDef } from "@/engine/types";
import { hintsFor, misconceptionText, theoryFor } from "@/lib/content";
import { rootFor } from "@/lib/root-beliefs";

/*
 * What a "Guess with the room" class sees (CLAUDE.md §D), from real counts
 * only: the simulator's answer for the experiment's starting setup, how many
 * guessed each option, the share who guessed wrong, the most common wrong
 * idea in plain words and two sentences on what the class needs next. The
 * simulator judges; the wrong idea behind each option comes from the same
 * wrong-model diagnosis the lab uses.
 */

export interface ClassSummary {
  answer: string;
  total: number;
  wrong: number;
  /** The most-picked wrong option and the idea behind it, if anyone guessed wrong. */
  commonWrong: { option: string; count: number; idea: string | null } | null;
  /** Two sentences for the teacher: what to look at, then where to go next. */
  next: [string, string] | null;
}

/** The simulator's answer for the experiment as it starts. */
export function roomAnswer(def: ExperimentDef): string {
  const options = def.prediction.type === "choice" ? def.prediction.options : [];
  const run = runExperiment(def, initialBuild(def), { type: "choice", value: options[0] ?? "" }, {});
  return run.outcome.result.type === "choice" ? run.outcome.result.value : "";
}

/** The wrong idea behind one option, from the lab's own diagnosis (null if no wrong model matches it). */
export function ideaBehind(def: ExperimentDef, option: string): string | null {
  const run = runExperiment(def, initialBuild(def), { type: "choice", value: option }, {});
  const id = run.diagnosis?.focus;
  return id ? (misconceptionText(id)?.belief ?? null) : null;
}

export function classSummary(def: ExperimentDef, counts: readonly number[]): ClassSummary {
  const options = def.prediction.type === "choice" ? def.prediction.options : [];
  const answer = roomAnswer(def);
  const total = counts.reduce((a, b) => a + b, 0);
  const wrongOptions = options.map((option, i) => ({ option, count: counts[i] ?? 0 })).filter((o) => o.option !== answer);
  const wrong = wrongOptions.reduce((a, o) => a + o.count, 0);
  const top = [...wrongOptions].sort((a, b) => b.count - a.count)[0];
  if (!top || top.count === 0) {
    return { answer, total, wrong, commonWrong: null, next: total > 0 ? ["Everyone guessed right. Run it together to see why.", `Then open the theory: ${theoryFor(def.theoryId)?.title ?? def.title}.`] : null };
  }
  const run = runExperiment(def, initialBuild(def), { type: "choice", value: top.option }, {});
  const id = run.diagnosis?.focus ?? null;
  const idea = id ? (misconceptionText(id)?.belief ?? null) : null;
  const hint = id ? hintsFor(id)?.hints[0] : undefined;
  const root = id ? rootFor(id) : undefined;
  return {
    answer,
    total,
    wrong,
    commonWrong: { option: top.option, count: top.count, idea },
    next: [
      hint ? `Run it together and ask: ${hint}` : "Run it together and watch where the guesses split from what happens.",
      root ? `Many guesses share one idea: that ${root.plainWords}. The theory view explains why that isn't so.` : `Then open the theory: ${theoryFor(def.theoryId)?.title ?? def.title}.`,
    ],
  };
}
