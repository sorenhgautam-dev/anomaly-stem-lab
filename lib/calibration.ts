import type { Calls } from "@/lib/progress";
import type { Confidence } from "@/lib/store";

/*
 * The calibration meter on My ideas: how often the student's guesses were
 * right at each "how sure" setting, from saved runs. Good scientists are
 * right about as often as they feel sure; the meter shows the real counts.
 */

export const CONFIDENCE_ROWS: { id: Confidence; label: string }[] = [
  { id: "certain", label: "When you were sure" },
  { id: "fairly", label: "When you were fairly sure" },
  { id: "guess", label: "When you were guessing" },
];

/** Whole-number percent, or null with no guesses yet (never a made-up 0 %). */
export function rightPercent(c: { right: number; total: number }): number | null {
  return c.total > 0 ? Math.round((c.right / c.total) * 100) : null;
}

/** The headline line for the "sure" guesses, in plain words. */
export function calibrationLine(calls: Calls): string {
  const sure = calls.certain;
  if (sure.total === 0) return "Pick “Certain” under “How sure are you?” before a run. This shows how often your sure guesses are right.";
  const times = sure.total === 1 ? "time" : "times";
  return `When you were sure, you were right ${sure.right} of ${sure.total} ${times}.`;
}

/** A short nudge that matches the numbers: only once there are enough sure guesses to mean something. */
export function calibrationNudge(calls: Calls): string | null {
  const sure = calls.certain;
  const p = rightPercent(sure);
  if (p === null || sure.total < 3) return null;
  if (p >= 80) return "Your sure guesses are usually right. Nice!";
  if (p >= 50) return "Your sure guesses are right about half the time. Testing helps!";
  return "Your sure guesses often surprise you. That's where the best learning is.";
}
