import { matches } from "./match";
import { wrongModel } from "./registry";
import { simulateOutcome } from "./outcome";
import type { Build, Diagnosis, Evidence, ExperimentDef, Outcome, Prediction } from "./types";

/** Matching runs needed before a misconception is labelled "likely" (CLAUDE.md §6.2). */
export const LIKELY_AFTER = 2;

/**
 * Wrong-model diagnosis: run the build through every misconception listed by
 * the experiment. Any wrong model whose answer matches the student's
 * prediction is a candidate and gains one piece of evidence.
 */
export function diagnose(
  def: ExperimentDef,
  build: Build,
  prediction: Prediction,
  evidence: Evidence,
): Diagnosis {
  const next: Evidence = { ...evidence };
  const hits: { id: string; outcome: Outcome }[] = [];

  for (const id of def.misconceptions) {
    const model = wrongModel(id);
    if (!model) continue;
    const outcome = simulateOutcome(def, build, model);
    if (matches(def.prediction, prediction, outcome.result)) {
      hits.push({ id, outcome });
      next[id] = (next[id] ?? 0) + 1;
    }
  }

  // The best candidate is the one with the most evidence so far; ties keep
  // the experiment's listed order.
  const best = [...hits].sort((x, y) => (next[y.id] ?? 0) - (next[x.id] ?? 0))[0] ?? null;
  const likely =
    hits
      .map((h) => h.id)
      .filter((id) => (next[id] ?? 0) >= LIKELY_AFTER)
      .sort((x, y) => (next[y] ?? 0) - (next[x] ?? 0))[0] ?? null;

  return {
    candidates: hits.map((h) => h.id),
    likely,
    evidence: next,
    ghost: best?.outcome ?? null,
    focus: best?.id ?? null,
  };
}
