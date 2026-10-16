import type { Simulate } from "../types";
import { booleanSetting, burstDone, burstRate, makeTimeline, numberSetting } from "./common";

/*
 * Stage "fizz": conservation of mass when a reaction makes a gas
 * (experiment "Mass in a sealed bag").
 *
 * Baking soda and vinegar react inside a zip bag on a scale:
 *   NaHCO3 + CH3COOH → CH3COONa + H2O + CO2
 * One mole of baking soda (84 g) makes one mole of carbon dioxide (44 g).
 *
 * Assumptions (simplified, but honest):
 *  - Everything is on the scale from the start: a 4-litre zip bag and a small
 *    cup (25 g together), 100 g of vinegar in the cup, and the baking soda
 *    (the `soda` setting, grams). Tipping the cup starts the reaction.
 *  - The vinegar is strong cleaning vinegar (8% acetic acid): 100 g holds
 *    0.133 mol of acid, enough for about 11 g of baking soda. So on the
 *    2–10 g slider the vinegar is in excess and all the baking soda reacts.
 *    Past ~11 g the acid runs out and the extra baking soda just sits there.
 *  - About 95% of the CO2 comes out of the liquid as gas; the rest stays
 *    dissolved. Open bag (`sealed` false): that gas escapes into the room.
 *    Sealed bag: it stays in the bag, which swells (ideal gas at 20 °C and
 *    1 atm: 24.05 L/mol, so 5 g of baking soda makes about 1.36 L of gas).
 *  - Buoyancy is ignored. As the sealed bag swells it pushes aside air, which
 *    buoys it up by about 1.2 mg per mL, so a very precise balance would read
 *    a little less (roughly 1.6 g for 5 g of baking soda). The mass inside
 *    doesn't change, and the scale here shows that true mass.
 *  - The fizz is one burst that peaks 1 s after mixing and is over well
 *    before the 10 s run ends. Escaping gas trails a little behind.
 *  - Bubble intensity follows the rate of gas production, scaled so 10 g of
 *    baking soda (the top of the slider) peaks at 1.
 *  - The temperature stays at 20 °C. (The reaction cools the liquid a few
 *    degrees, which doesn't change any mass.)
 *
 * Readings:
 *   scale.start, scale.end   g on the scale before and after
 *   co2.made, co2.escaped    g of carbon dioxide made / lost to the room
 *   bag.volume               mL of gas held in the bag (0 when open)
 *   bubbles.peak             strongest fizz, 0..1
 * Timeline values: scale.grams, co2.made, co2.escaped, bubbles (0..1),
 *   bagVolume (mL of gas in the bag).
 *
 * Wrong models:
 *   gas-has-no-mass   gas weighs nothing: all the mass that turns into CO2
 *                     vanishes from the reading, even in a sealed bag
 *                     (end = start − CO2 made). The bag still swells.
 *   nothing-escapes   gas can't leave an open bag (end = start).
 */

type Belief = "real" | "gas-has-no-mass" | "nothing-escapes";

const BAG_AND_CUP_G = 25;
const VINEGAR_G = 100;
/** Acetic acid in the vinegar, by mass. */
const ACID_FRACTION = 0.08;
const ACID_G_PER_MOL = 60.05;
const SODA_G_PER_MOL = 84;
const CO2_G_PER_MOL = 44;
/** Share of the CO2 that comes out as gas; the rest stays dissolved. */
const GAS_FRACTION = 0.95;
/** Baking soda that gives the strongest fizz (bubbles = 1): the slider's top. */
const FULL_FIZZ_SODA_G = 10;
/** mL of gas per mole at 20 °C and 1 atm (RT / P). */
const ML_PER_MOL = (8.314 * 293.15 * 1000) / 101.325;

/** Seconds after mixing when the fizz is strongest. */
const FIZZ_TAU = 1;
/** Gas leaves the open bag a little after it forms. */
const ESCAPE_TAU = 1.2;

function fizzModel(belief: Belief): Simulate {
  return (def, build) => {
    const sealed = booleanSetting(def, build, "sealed", false);
    const soda = numberSetting(def, build, "soda", 5, 0, 1000);

    const acidMol = (VINEGAR_G * ACID_FRACTION) / ACID_G_PER_MOL;
    const co2Mol = Math.min(soda / SODA_G_PER_MOL, acidMol);
    const made = co2Mol * CO2_G_PER_MOL;
    const start = BAG_AND_CUP_G + VINEGAR_G + soda;

    const canEscape = !sealed && belief !== "nothing-escapes";
    const escaped = canEscape ? GAS_FRACTION * made : 0;
    // The no-mass belief loses every gram that became gas, sealed or not.
    const lost = belief === "gas-has-no-mass" ? made : escaped;
    const bagVolume = sealed ? GAS_FRACTION * co2Mol * ML_PER_MOL : 0;

    const fizz = Math.min(1, made / ((FULL_FIZZ_SODA_G / SODA_G_PER_MOL) * CO2_G_PER_MOL));

    const timeline = makeTimeline((t) => {
      const done = burstDone(t, FIZZ_TAU);
      const out = escaped * burstDone(t, ESCAPE_TAU);
      const gone = belief === "gas-has-no-mass" ? made * done : out;
      return {
        "scale.grams": start - gone,
        "co2.made": made * done,
        "co2.escaped": out,
        bubbles: fizz * burstRate(t, FIZZ_TAU),
        bagVolume: bagVolume * done,
      };
    });

    return {
      readings: {
        "scale.start": start,
        "scale.end": start - lost,
        "co2.made": made,
        "co2.escaped": escaped,
        "bag.volume": bagVolume,
        "bubbles.peak": Math.max(...timeline.map((f) => f.values.bubbles)),
      },
      faults: [],
      timeline,
    };
  };
}

export const simulateFizz: Simulate = fizzModel("real");

export const fizzWrongModels: Record<string, Simulate> = {
  "gas-has-no-mass": fizzModel("gas-has-no-mass"),
  "nothing-escapes": fizzModel("nothing-escapes"),
};
