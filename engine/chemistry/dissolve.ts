import type { Simulate } from "../types";
import { makeTimeline, numberSetting, RUN_SECONDS, smoothstep } from "./common";

/*
 * Stage "dissolve": mass is conserved when sugar dissolves in water.
 *
 * A beaker of water and a dish of sugar sit on one scale. The sugar is poured
 * into the water and dissolves over the run.
 *
 * Assumptions (simplified, but honest):
 *  - The scale holds a 120 g beaker, 200 g of water and the sugar (the
 *    `sugar` setting, grams). The dish is a light weighing boat whose couple
 *    of grams we leave out. It stays on the scale, so it couldn't change the
 *    reading anyway.
 *  - Sucrose dissolves up to about 2 g per gram of water at 20 °C (~200 g per
 *    100 g), so 200 g of water holds about 400 g. Everything on the 10–50 g
 *    slider dissolves. Past 400 g the extra stays as crystals on the bottom.
 *  - Dissolving changes nothing on the scale: every sugar molecule is still in
 *    the beaker, just spread out among the water molecules.
 *  - Timing, in display seconds: the sugar is poured in during the first
 *    second, dissolves along a smooth S-curve and is fully dissolved by
 *    t = 9 s. Stirring spreads it evenly through the water by t = 10 s.
 *
 * Readings:
 *   scale.start, scale.end   g on the scale before and after
 *   sugar.grams              g of sugar used
 *   sugar.dissolved          fraction of the sugar dissolved at the end, 0..1
 * Timeline values: scale.grams, sugar.dissolved (0 → 1), spread (0..1, how
 *   evenly the dissolved sugar is spread through the water).
 *
 * Wrong model:
 *   dissolved-means-gone   dissolved sugar no longer exists, so the scale
 *                          drops by the mass of sugar that has dissolved.
 */

type Belief = "real" | "dissolved-means-gone";

const BEAKER_G = 120;
const WATER_G = 200;
/** Grams of sugar one gram of water can dissolve at 20 °C. */
const SOLUBILITY = 2;

/** The sugar has landed in the water by now (display seconds). */
const POURED_AT = 1;
/** …and has all dissolved by now. */
const DISSOLVED_BY = 9;
/** Dissolved sugar starts spreading out once it is in the water. */
const SPREAD_FROM = 1.5;

function dissolveModel(belief: Belief): Simulate {
  return (def, build) => {
    const sugar = numberSetting(def, build, "sugar", 20, 0, 100000);
    const start = BEAKER_G + WATER_G + sugar;
    const capacity = SOLUBILITY * WATER_G;
    const finalFraction = sugar <= capacity ? 1 : capacity / sugar;

    // The belief: whatever has dissolved has gone, so it no longer weighs anything.
    const shown = (dissolved: number) => (belief === "dissolved-means-gone" ? start - sugar * dissolved : start);

    const timeline = makeTimeline((t) => {
      const dissolved = finalFraction * smoothstep(POURED_AT, DISSOLVED_BY, t);
      return {
        "scale.grams": shown(dissolved),
        "sugar.dissolved": dissolved,
        spread: smoothstep(SPREAD_FROM, RUN_SECONDS, t),
      };
    });

    return {
      readings: {
        "scale.start": start,
        "scale.end": shown(finalFraction),
        "sugar.grams": sugar,
        "sugar.dissolved": finalFraction,
      },
      faults: [],
      timeline,
    };
  };
}

export const simulateDissolve: Simulate = dissolveModel("real");

export const dissolveWrongModels: Record<string, Simulate> = {
  "dissolved-means-gone": dissolveModel("dissolved-means-gone"),
};
