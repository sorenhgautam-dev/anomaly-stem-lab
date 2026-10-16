import { initialBuild } from "./edits";
import { answerFor } from "./rules";
import type { Build, ExperimentDef, Outcome, Simulate } from "./types";

/**
 * Run one model on a build and answer the experiment's question with it.
 * A "change" answer compares against the starting build run through the
 * same model, so a belief is applied consistently to both sides.
 */
export function simulateOutcome(def: ExperimentDef, build: Build, simulate: Simulate): Outcome {
  const sim = simulate(def, build);
  const baseline = def.answer.kind === "change" ? simulate(def, initialBuild(def)) : null;
  return { ...sim, result: answerFor(def.answer, sim, baseline) };
}
