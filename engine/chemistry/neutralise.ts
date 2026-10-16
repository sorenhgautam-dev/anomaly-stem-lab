import type { Simulate } from "../types";
import { clamp, interpolate, makeTimeline, numberSetting } from "./common";

/*
 * Stage "neutralise": adding a base to an acid (experiment "Neutralisation and pH").
 *
 * 25 mL of 0.1 M hydrochloric acid with a few drops of universal indicator.
 * A burette adds 0.1 M sodium hydroxide (the `base` setting, mL):
 *   HCl + NaOH → NaCl + H2O   (H⁺ + OH⁻ → H2O)
 *
 * Assumptions (simplified, but honest):
 *  - Strong acid and strong base, fully ionised. Volumes simply add.
 *  - pH comes from the charge balance [H⁺] − [OH⁻] = (acid left − base added)
 *    / total volume, with Kw = 1.0 × 10⁻¹⁴ (25 °C). So the pH is 1.00 at the
 *    start, 7.00 at the equivalence point (25 mL, where the moles match) and
 *    jumps steeply either side of it.
 *  - Universal indicator colour as a hue in degrees: red (pH 1), orange,
 *    yellow, green at pH 7, blue (pH 9), then indigo to violet (pH 13).
 *  - Timing: the burette adds the base at a steady rate from t = 0.5 s to
 *    t = 8.5 s, and the solution is stirred, so the pH follows the volume
 *    added so far.
 *
 * Readings:
 *   ph               pH at the end
 *   base.ml          mL of sodium hydroxide added
 *   equivalence.ml   mL of base that exactly neutralises the acid (25)
 *   indicator.hue    universal indicator colour at the end, degrees
 * Timeline values: ph, base (mL added so far), hue (degrees).
 *
 * Wrong models:
 *   any-base-neutralises   any amount of base cancels all the acid: once
 *                          base goes in, the solution is neutral (pH 7).
 *   base-only-dilutes      base doesn't react with the acid, it only waters
 *                          it down: the pH rises a little from dilution and
 *                          the solution stays acidic.
 */

type Belief = "real" | "any-base-neutralises" | "base-only-dilutes";

const ACID_ML = 25;
const ACID_M = 0.1;
const BASE_M = 0.1;
const KW = 1e-14;
/** The burette runs between these display seconds. */
const DRIP_FROM = 0.5;
const DRIP_TO = 8.5;

/** Universal indicator colour (hue, degrees) at each pH. */
const UNIVERSAL_HUE: [number, number][] = [
  [0, 0],
  [1, 0],
  [3, 25],
  [5, 50],
  [6, 80],
  [7, 120],
  [8, 170],
  [9, 210],
  [11, 245],
  [13, 275],
  [14, 280],
];

/** pH after `baseMl` of sodium hydroxide has reacted with the acid. */
function phAfter(baseMl: number): number {
  // Excess acid concentration, mol/L (mmol/mL); negative when base is left over.
  const excess = (ACID_ML * ACID_M - baseMl * BASE_M) / (ACID_ML + baseMl);
  const root = Math.sqrt(excess * excess + 4 * KW);
  // [H⁺] from [H⁺] − Kw/[H⁺] = excess, written to stay accurate on both sides.
  const h = excess >= 0 ? (excess + root) / 2 : (2 * KW) / (root - excess);
  return -Math.log10(h);
}

function phBelieved(belief: Belief, baseMl: number): number {
  if (belief === "any-base-neutralises") return baseMl > 0 ? 7 : phAfter(0);
  // Dilution only: the same acid spread through more liquid.
  if (belief === "base-only-dilutes") return -Math.log10((ACID_ML * ACID_M) / (ACID_ML + baseMl));
  return phAfter(baseMl);
}

function neutraliseModel(belief: Belief): Simulate {
  return (def, build) => {
    const baseMl = numberSetting(def, build, "base", 10, 0, 100);
    const ph = phBelieved(belief, baseMl);

    const timeline = makeTimeline((t) => {
      const added = baseMl * clamp((t - DRIP_FROM) / (DRIP_TO - DRIP_FROM), 0, 1);
      const now = phBelieved(belief, added);
      return { ph: now, base: added, hue: interpolate(UNIVERSAL_HUE, now) };
    });

    return {
      readings: {
        ph,
        "base.ml": baseMl,
        "equivalence.ml": (ACID_ML * ACID_M) / BASE_M,
        "indicator.hue": interpolate(UNIVERSAL_HUE, ph),
      },
      faults: [],
      timeline,
    };
  };
}

export const simulateNeutralise: Simulate = neutraliseModel("real");

export const neutraliseWrongModels: Record<string, Simulate> = {
  "any-base-neutralises": neutraliseModel("any-base-neutralises"),
  "base-only-dilutes": neutraliseModel("base-only-dilutes"),
};
