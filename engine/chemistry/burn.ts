import type { Simulate } from "../types";
import { booleanSetting, burstDone, burstRate, makeTimeline, numberSetting } from "./common";

/*
 * Stage "burn": does burning make things lighter?
 * (experiment "Burning in open vs sealed containers").
 *
 * A wad of steel wool (the `wool` setting, grams) sits in a 1-litre glass jar
 * on a scale. A 9 V battery touched to it starts it burning. The lid is either
 * off (`sealed` false) or screwed on (`sealed` true).
 *   3Fe + 2O2 → Fe3O4
 * Each gram of iron that burns takes in 64 / 167.5 = 0.382 g of oxygen.
 *
 * Assumptions (simplified, but honest):
 *  - The jar and lid weigh 250 g together and both stay on the scale.
 *  - Burning steel wool makes mostly black iron oxide (Fe3O4). In open air
 *    about half of the wool's iron burns; the inside of the wad is shielded.
 *  - Open jar: the oxygen comes from the room, so the scale gains the mass of
 *    the oxygen that joins the iron.
 *  - Sealed jar: the oxygen comes from the litre of air inside (21% oxygen,
 *    0.279 g at 20 °C), which was on the scale all along, so the reading
 *    can't change. Burning slows as that oxygen thins out: the iron burned
 *    approaches the 0.730 g the jar's oxygen could handle.
 *    (Opening the lid afterwards lets air rush back in; not modelled.)
 *  - Timing: the battery touches the wool at t = 0.5 s; the burning peaks a
 *    second later and has died away well before the 10 s run ends.
 *  - `glow` is how brightly the wool glows, 0..1 (1 = its brightest in open air).
 *
 * Readings:
 *   scale.start, scale.end   g on the scale before and after
 *   oxygen.used              g of oxygen that joined the iron
 * Timeline values: scale.grams, glow (0..1), oxide (share of the wool's iron
 *   turned to oxide, 0..1).
 *
 * Wrong models:
 *   burning-destroys-matter   burning uses matter up: the iron that burns
 *                             vanishes from the scale, open or sealed.
 *   oxygen-only-helps         oxygen only helps the burning and doesn't join
 *                             the iron, so the mass stays the same, open or sealed.
 */

type Belief = "real" | "burning-destroys-matter" | "oxygen-only-helps";

const JAR_G = 250;
/** Share of the wool's iron that burns in open air. */
const BURN_FRACTION = 0.5;
/** g of oxygen per g of iron in Fe3O4 (2 × 32.00 / (3 × 55.845)). */
const O2_PER_FE = 64 / (3 * 55.845);
/** g of oxygen in 1 L of air at 20 °C and 1 atm (20.95% of the molecules). */
const JAR_O2_G = ((101.325 * 1) / (8.314 * 293.15)) * 0.2095 * 32;

const IGNITE_AT = 0.5;
const BURN_TAU = 1;

function burnModel(belief: Belief): Simulate {
  return (def, build) => {
    const sealed = booleanSetting(def, build, "sealed", false);
    const wool = numberSetting(def, build, "wool", 2, 0, 50);
    const start = JAR_G + wool;

    const inOpenAir = BURN_FRACTION * wool;
    const jarLimit = JAR_O2_G / O2_PER_FE;
    // Iron burned once the open-air burn is `progress` (0..1) of the way through.
    const burned = (progress: number) =>
      sealed ? jarLimit * (1 - Math.exp((-inOpenAir * progress) / jarLimit)) : inOpenAir * progress;

    const shown = (iron: number) => {
      if (belief === "burning-destroys-matter") return start - iron;
      if (belief === "oxygen-only-helps" || sealed) return start;
      return start + O2_PER_FE * iron;
    };

    const timeline = makeTimeline((t) => {
      const iron = burned(burstDone(t, BURN_TAU, IGNITE_AT));
      // In the sealed jar the glow dims as the oxygen runs low.
      const oxygenLeft = sealed ? 1 - iron / jarLimit : 1;
      return {
        "scale.grams": shown(iron),
        glow: wool > 0 ? burstRate(t, BURN_TAU, IGNITE_AT) * oxygenLeft : 0,
        oxide: wool > 0 ? iron / wool : 0,
      };
    });

    const iron = burned(1);
    return {
      readings: {
        "scale.start": start,
        "scale.end": shown(iron),
        "oxygen.used": O2_PER_FE * iron,
      },
      faults: [],
      timeline,
    };
  };
}

export const simulateBurn: Simulate = burnModel("real");

export const burnWrongModels: Record<string, Simulate> = {
  "burning-destroys-matter": burnModel("burning-destroys-matter"),
  "oxygen-only-helps": burnModel("oxygen-only-helps"),
};
