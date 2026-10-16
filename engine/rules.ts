import type { AnswerRule, Condition, Prediction, Simulation } from "./types";

/*
 * The tiny rule language experiments use (in JSON) to turn a Simulation into
 * an answer. See AnswerRule and Condition in types.ts.
 */

/** A missing reading counts as 0, so conditions on parts that aren't placed stay simple. */
export function reading(sim: Simulation, key: string): number {
  return sim.readings[key] ?? 0;
}

export function holds(condition: Condition, sim: Simulation): boolean {
  if ("all" in condition) return condition.all.every((c) => holds(c, sim));
  if ("any" in condition) return condition.any.some((c) => holds(c, sim));
  if ("not" in condition) return !holds(condition.not, sim);
  if ("fault" in condition) return sim.faults.includes(condition.fault);
  const v = reading(sim, condition.reading);
  switch (condition.op) {
    case ">":
      return v > condition.value;
    case ">=":
      return v >= condition.value;
    case "<":
      return v < condition.value;
    case "<=":
      return v <= condition.value;
    case "==":
      return Math.abs(v - condition.value) < 1e-9;
    case "!=":
      return Math.abs(v - condition.value) >= 1e-9;
  }
}

/** Equal within a relative tolerance (and treat two near-zero values as equal). */
function roughlyEqual(a: number, b: number, tolerance: number): boolean {
  const scale = Math.max(Math.abs(a), Math.abs(b));
  if (scale < 1e-6) return true;
  return Math.abs(a - b) <= tolerance * scale;
}

/**
 * Apply an answer rule. `baseline` is the Simulation of the experiment's
 * starting build; only the "change" rule needs it.
 */
export function answerFor(rule: AnswerRule, sim: Simulation, baseline: Simulation | null): Prediction {
  switch (rule.kind) {
    case "cases": {
      const hit = rule.cases.find((c) => holds(c.when, sim));
      return { type: "choice", value: hit ? hit.answer : rule.otherwise };
    }
    case "compare": {
      const a = reading(sim, rule.a);
      const b = reading(sim, rule.b);
      if (roughlyEqual(a, b, rule.tolerance)) return { type: "choice", value: rule.same };
      return { type: "choice", value: a > b ? rule.aBigger : rule.bBigger };
    }
    case "change": {
      const now = reading(sim, rule.reading);
      const before = baseline ? reading(baseline, rule.reading) : now;
      if (rule.zero !== undefined && Math.abs(now) < 0.02 && Math.abs(before) >= 0.02) {
        return { type: "choice", value: rule.zero };
      }
      if (roughlyEqual(now, before, rule.tolerance)) return { type: "choice", value: rule.same };
      return { type: "choice", value: now > before ? rule.up : rule.down };
    }
    case "value":
      return { type: "slider", value: reading(sim, rule.reading) };
  }
}
