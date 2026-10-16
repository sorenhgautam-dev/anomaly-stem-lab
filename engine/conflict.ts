import { applyEdit, sameBuild } from "./edits";
import { realModel, wrongModel } from "./registry";
import { simulateOutcome } from "./outcome";
import type { AllowedEdit, Build, ExperimentDef, Outcome, Prediction } from "./types";

export interface ConflictEdit {
  edit: AllowedEdit;
  /** The build after the edit. */
  build: Build;
  /** What really happens after the edit. */
  realAnswer: Prediction;
  /** What the misconception says happens after the edit. */
  beliefAnswer: Prediction;
}

/** How strongly two outcomes disagree: answers first, readings to break ties. */
function disagreement(real: Outcome, belief: Outcome): number {
  const answersDiffer = JSON.stringify(real.result) !== JSON.stringify(belief.result) ? 1 : 0;
  let spread = 0;
  for (const key of Object.keys(real.readings)) {
    const a = real.readings[key] ?? 0;
    const b = belief.readings[key] ?? 0;
    const scale = Math.max(Math.abs(a), Math.abs(b));
    if (scale > 1e-6) spread += Math.abs(a - b) / scale;
  }
  return answersDiffer * 1000 + spread;
}

/**
 * The small edit where the belief and reality disagree the most
 * (CLAUDE.md §6.2). Returns null if no allowed edit separates them.
 */
export function conflict(def: ExperimentDef, build: Build, misconceptionId: string): ConflictEdit | null {
  const belief = wrongModel(misconceptionId);
  if (!belief) return null;
  const real = realModel(def.stage);

  let best: ConflictEdit | null = null;
  let bestScore = 0;
  for (const allowed of def.allowedEdits) {
    const edited = applyEdit(build, allowed.edit);
    if (sameBuild(edited, build)) continue;
    const r = simulateOutcome(def, edited, real);
    const b = simulateOutcome(def, edited, belief);
    const score = disagreement(r, b);
    if (score > bestScore) {
      bestScore = score;
      best = { edit: allowed, build: edited, realAnswer: r.result, beliefAnswer: b.result };
    }
  }
  return best;
}
