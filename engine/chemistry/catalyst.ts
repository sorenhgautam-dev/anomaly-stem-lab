import type { Simulate } from "../types";
import { makeTimeline, numberSetting, RUN_SECONDS } from "./common";

/*
 * Stage "catalyst": manganese dioxide and hydrogen peroxide
 * (experiment "Activation energy and catalysts").
 *
 * Powdered manganese dioxide (the `catalyst` setting, grams) is tipped into
 * 20 mL of 3% hydrogen peroxide, and the oxygen is collected for 120 s:
 *   2H2O2 → 2H2O + O2
 *
 * Assumptions (simplified, but honest):
 *  - 20 mL of 3% (w/v) peroxide holds 0.6 g (0.01764 mol), enough for
 *    212 mL of oxygen at 20 °C and 1 atm. That is the most any amount of
 *    catalyst can give: a catalyst speeds a reaction up, it doesn't make more.
 *  - First-order decay: with 1 g of catalyst half the peroxide breaks down
 *    every 20 s, and the rate grows in proportion to the catalyst's mass
 *    (more powder, more surface). Without a catalyst, 3% peroxide keeps for
 *    months: half-life taken as 30 days.
 *  - Activation energy: about 75 kJ/mol without a catalyst and about 58 kJ/mol
 *    on manganese dioxide (textbook values; the rates above are set from
 *    classroom timings, not calculated from these).
 *  - The catalyst comes out unchanged: the same mass is there at the end.
 *  - Temperature stays at 20 °C. Display: 120 real seconds over the 10 s run.
 *
 * Readings:
 *   catalyst.start, catalyst.end   g of manganese dioxide
 *   catalyst.leftFraction          catalyst.end / catalyst.start (1 when there was none)
 *   o2.ml                          mL of oxygen collected by the end
 *   rate                           mL of oxygen per second at the start
 *   activation.kj                  activation energy of the path taken, kJ/mol
 *   activation.uncatalysedKj       activation energy without a catalyst, kJ/mol
 * Timeline values: o2 (mL so far), rate (mL/s now), catalyst (g left).
 *
 * Wrong model:
 *   catalyst-used-up   the catalyst gets used up like a reactant: it wears
 *                      away in step with the peroxide it breaks down. The
 *                      fizz looks the same; only the catalyst's fate differs.
 */

type Belief = "real" | "catalyst-used-up";

/** 20 mL of 3% (w/v) hydrogen peroxide. */
const PEROXIDE_G = 0.6;
const PEROXIDE_G_PER_MOL = 34.0147;
/** mL of gas per mole at 20 °C and 1 atm. */
const ML_PER_MOL = (8.314 * 293.15 * 1000) / 101.325;
const O2_MAX_ML = (PEROXIDE_G / PEROXIDE_G_PER_MOL / 2) * ML_PER_MOL;

/** Rate constant per gram of catalyst (half-life 20 s with 1 g), per second. */
const K_PER_G = Math.LN2 / 20;
/** Without a catalyst: half-life of about a month. */
const K_ALONE = Math.LN2 / (30 * 24 * 3600);
const EA_ALONE_KJ = 75;
const EA_MNO2_KJ = 58;
/** Real seconds shown over the 10 s run. */
const RUN_REAL_S = 120;

function catalystModel(belief: Belief): Simulate {
  return (def, build) => {
    const catalyst = numberSetting(def, build, "catalyst", 1, 0, 100);
    const k = K_PER_G * catalyst + K_ALONE;

    const left = (s: number) => Math.exp(-k * s); // share of the peroxide left
    const catalystAt = (s: number) => (belief === "catalyst-used-up" ? catalyst * left(s) : catalyst);

    const timeline = makeTimeline((t) => {
      const s = (t * RUN_REAL_S) / RUN_SECONDS;
      return {
        o2: O2_MAX_ML * (1 - left(s)),
        rate: k * O2_MAX_ML * left(s),
        catalyst: catalystAt(s),
      };
    });

    const end = catalystAt(RUN_REAL_S);
    return {
      readings: {
        "catalyst.start": catalyst,
        "catalyst.end": end,
        "catalyst.leftFraction": catalyst > 0 ? end / catalyst : 1,
        "o2.ml": O2_MAX_ML * (1 - left(RUN_REAL_S)),
        rate: k * O2_MAX_ML,
        "activation.kj": catalyst > 0 ? EA_MNO2_KJ : EA_ALONE_KJ,
        "activation.uncatalysedKj": EA_ALONE_KJ,
      },
      faults: [],
      timeline,
    };
  };
}

export const simulateCatalyst: Simulate = catalystModel("real");

export const catalystWrongModels: Record<string, Simulate> = {
  "catalyst-used-up": catalystModel("catalyst-used-up"),
};
