import { diagnose } from "./diagnose";
import { matches } from "./match";
import { simulateOutcome } from "./outcome";
import { realModel } from "./registry";
import { holds } from "./rules";
import type { Build, Evidence, ExperimentDef, Prediction, RunResult } from "./types";

export { simulateOutcome };

/** runExperiment(build, prediction) → verdict + diagnosis (CLAUDE.md §6.1). */
export function runExperiment(
  def: ExperimentDef,
  build: Build,
  prediction: Prediction,
  evidence: Evidence,
): RunResult {
  const outcome = simulateOutcome(def, build, realModel(def.stage));
  const correct = matches(def.prediction, prediction, outcome.result);
  const goalMet = def.goalCondition ? holds(def.goalCondition, outcome) : true;
  return {
    verdict: correct ? "correct" : "wrong",
    outcome,
    diagnosis: correct ? null : diagnose(def, build, prediction, evidence),
    goalMet,
  };
}
