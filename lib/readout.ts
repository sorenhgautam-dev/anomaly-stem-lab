import { z } from "zod";

/*
 * One simulator reading as a student reads it: a label for cards and
 * charts, a name for Ano's sentences ("the thermometer"), and how to turn
 * the raw number into text (unit, decimals, ×100 for fractions, left/right
 * for signed turns). Shared by the replay (content/replays.json) and the
 * "What if?" buttons (content/what-if.json). Numbers are always the
 * simulator's own, only rounded.
 */

export const readoutSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  name: z.string().min(1),
  unit: z.string(),
  digits: z.number().int().min(0).max(3),
  /** Multiply before showing, e.g. 100 for a 0..1 fraction shown in %. */
  scale: z.number().positive().optional(),
  /** Show the size only (an angle that runs negative). */
  abs: z.boolean().optional(),
  /** Words for positive and negative values, e.g. ["left", "right"]. */
  signWords: z.tuple([z.string(), z.string()]).optional(),
});

export type Readout = z.infer<typeof readoutSchema>;

/** The number as shown, before words and units: scaled, made positive if asked, rounded. */
export function shownNumber(value: number, r: Readout): number {
  const v = value * (r.scale ?? 1);
  const shown = r.abs || r.signWords ? Math.abs(v) : v;
  const p = 10 ** r.digits;
  return Math.round(shown * p) / p;
}

export function formatReadout(value: number, r: Readout): string {
  if (!Number.isFinite(value)) return "no reading";
  const n = shownNumber(value, r);
  const text = n.toFixed(r.digits);
  // "−0.0" reads oddly to a student: a rounded zero has no sign.
  const clean = Number(text) === 0 ? (0).toFixed(r.digits) : text;
  const unit = r.unit === "" ? "" : r.unit === "%" || r.unit === "×" || r.unit === "°" ? r.unit : ` ${r.unit}`;
  const side = r.signWords && Number(clean) !== 0 ? ` ${value * (r.scale ?? 1) > 0 ? r.signWords[0] : r.signWords[1]}` : "";
  return `${clean}${unit}${side}`;
}

/** Do two values show as the same text? Used to say "stayed at" honestly. */
export function sameShown(a: number, b: number, r: Readout): boolean {
  return formatReadout(a, r) === formatReadout(b, r);
}
