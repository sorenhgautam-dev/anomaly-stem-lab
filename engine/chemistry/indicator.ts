import type { Simulate } from "../types";
import { choiceSetting, interpolate, makeTimeline, smoothstep } from "./common";

/*
 * Stage "indicator": red cabbage indicator in a household liquid
 * (experiment "Indicator colours (acid or base)").
 *
 * A few drops of red cabbage indicator are stirred into one liquid, chosen
 * with the `liquid` setting.
 *
 * Assumptions (simplified, but honest):
 *  - Typical household pH values: lemon juice 2.2, white vinegar 2.5,
 *    water 7.0, baking soda solution 8.3, soapy water (bar soap) 10.
 *  - Red cabbage's anthocyanin dye is pink-red in acids, purple near
 *    neutral, blue then green in bases (and yellow at very high pH). The
 *    colour is given as a hue in degrees, interpolated from typical colours
 *    at each pH; the dye on its own (in neutral water) is purple.
 *  - Colour family the eye sees (`indicator.category`): pink or red below
 *    pH 5 (hue ≥ 300°), purple from pH 5 to 7.5, green or blue above 7.5
 *    (hue < 250°).
 *  - Timing: the indicator is dropped in at t = 0.5 s and is fully mixed by
 *    t = 3.5 s. The liquid's pH doesn't change; only the colour spreads.
 *
 * Readings:
 *   ph                   the liquid's pH
 *   indicator.hue        final colour, hue in degrees
 *   indicator.category   colour family: 0 acid (pink/red), 1 neutral (purple), 2 base (green/blue)
 * Timeline values: hue (degrees), mix (0 → 1, how mixed in the indicator is), ph.
 *
 * Wrong models (the student predicts the colour of the pH they believe in):
 *   harsh-means-acid    things that clean or sting are acids: soap and baking
 *                       soda are taken to be about as acidic as vinegar (pH 3).
 *   food-cant-be-acid   acids are dangerous, so foods aren't acids: lemon
 *                       juice and vinegar are taken to be neutral (pH 7).
 */

type Belief = "real" | "harsh-means-acid" | "food-cant-be-acid";

const PH: Record<string, number> = {
  lemon: 2.2,
  vinegar: 2.5,
  water: 7,
  "baking-soda": 8.3,
  soap: 10,
};
const LIQUIDS = Object.keys(PH);
const CLEANERS = ["soap", "baking-soda"];
const FOODS = ["lemon", "vinegar"];

/** Red cabbage indicator colour (hue, degrees) at each pH. */
const HUE_BY_PH: [number, number][] = [
  [0, 355],
  [1, 350],
  [3, 330],
  [5, 300],
  [7, 270],
  [8, 230],
  [9, 200],
  [10, 170],
  [11, 140],
  [12, 110],
  [13, 70],
  [14, 55],
];
/** The dye's own colour, in neutral water. */
const OWN_HUE = interpolate(HUE_BY_PH, 7);

const DROPPED_AT = 0.5;
const MIXED_BY = 3.5;

function category(ph: number): number {
  if (ph < 5) return 0;
  return ph <= 7.5 ? 1 : 2;
}

function indicatorModel(belief: Belief): Simulate {
  return (def, build) => {
    const liquid = choiceSetting(def, build, "liquid", LIQUIDS, "soap");
    let ph = PH[liquid];
    if (belief === "harsh-means-acid" && CLEANERS.includes(liquid)) ph = 3;
    if (belief === "food-cant-be-acid" && FOODS.includes(liquid)) ph = 7;
    const hue = interpolate(HUE_BY_PH, ph);

    const timeline = makeTimeline((t) => {
      const mix = smoothstep(DROPPED_AT, MIXED_BY, t);
      return { hue: OWN_HUE + (hue - OWN_HUE) * mix, mix, ph };
    });

    return {
      readings: { ph, "indicator.hue": hue, "indicator.category": category(ph) },
      faults: [],
      timeline,
    };
  };
}

export const simulateIndicator: Simulate = indicatorModel("real");

export const indicatorWrongModels: Record<string, Simulate> = {
  "harsh-means-acid": indicatorModel("harsh-means-acid"),
  "food-cant-be-acid": indicatorModel("food-cant-be-acid"),
};
