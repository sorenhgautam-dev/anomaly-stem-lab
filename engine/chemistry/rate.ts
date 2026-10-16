import type { Simulate } from "../types";
import { clamp, makeTimeline, numberSetting } from "./common";

/*
 * Stage "rate": temperature and reaction rate.
 *
 * Two identical fizzy (effervescent) tablets are dropped at the same moment
 * into cold water (the `cold` setting, °C) and hot water (`hot`, °C).
 *
 * Assumptions (simplified, but honest):
 *  - Each tablet's reaction (citric acid + baking soda → carbon dioxide)
 *    follows an Arrhenius rate, k ∝ e^(−Ea/RT). Ea ≈ 51 kJ/mol is chosen so
 *    the rate doubles from 20 °C to 30 °C, and a tablet takes 60 s at 20 °C.
 *    The speed-up per 10 °C shrinks slowly as the water gets hotter (about
 *    2.2× near 5 °C, 1.6× near 85 °C), just as Arrhenius predicts.
 *  - Real tablets also have to break up and dissolve, which speeds up less
 *    with heat, so very hot water won't be quite this fast in a real lab.
 *  - A tablet shrinks evenly from all sides, so the fraction left is
 *    (1 − time / finish time)³. Its gas comes off fastest at the start.
 *  - Water stays liquid: temperatures are kept between 0 °C and 100 °C.
 *  - Display time: the run is shown over 10 display seconds, with
 *    `timeScale` real seconds per display second, chosen so the slower
 *    tablet is gone at t = 9.5 s. `clock` shows real seconds.
 *  - Bubbles: how strong the fizz looks, 0..1. It is the tablet's gas rate
 *    compared with a fresh tablet in 90 °C water (the hottest on the slider),
 *    cube-rooted the way our eyes judge brightness, so a slow cold-water fizz
 *    stays visible while the hot one is clearly stronger. Both tablets, and
 *    the wrong model, share this one scale so they compare fairly.
 *
 * Readings:
 *   cold.finish, hot.finish   real seconds until each tablet is gone
 *   timeScale                 real seconds per display second
 * Timeline values: cold.remaining, hot.remaining (fraction left, 1 → 0),
 *   cold.bubbles, hot.bubbles (0..1), clock (real seconds).
 *
 * Wrong model:
 *   temperature-doesnt-matter   the water's temperature changes nothing, so
 *                               both tablets take the cold tablet's time.
 */

type Belief = "real" | "temperature-doesnt-matter";

const KELVIN = 273.15;
/** A tablet takes REF_FINISH_S real seconds in water at REF_C. */
const REF_C = 20;
const REF_FINISH_S = 60;
/** Ea / R in kelvin, chosen so the rate exactly doubles from 20 °C to 30 °C (Ea ≈ 51 kJ/mol). */
const EA_OVER_R = Math.LN2 / (1 / (REF_C + KELVIN) - 1 / (REF_C + 10 + KELVIN));
/** Display second at which the slower tablet is gone. */
const SLOWER_DONE_AT = 9.5;
/** A fresh tablet in water this hot fizzes at full strength (bubbles = 1). */
const FULL_FIZZ_C = 90;

/** Real seconds for a tablet to fizz away completely in water at `celsius`. */
function finishTime(celsius: number): number {
  return REF_FINISH_S * Math.exp(EA_OVER_R * (1 / (celsius + KELVIN) - 1 / (REF_C + KELVIN)));
}

/** A tablet that takes `finish` real seconds, `clock` real seconds after the drop. */
function tablet(finish: number, clock: number): { remaining: number; bubbles: number } {
  const left = Math.max(0, 1 - clock / finish);
  // Gas rate is (3 / finish) × left²; compare it with a fresh tablet at FULL_FIZZ_C, then cube-root it.
  const strength = Math.cbrt(finishTime(FULL_FIZZ_C) / finish) * left ** (2 / 3);
  return { remaining: left ** 3, bubbles: clamp(strength, 0, 1) };
}

function rateModel(belief: Belief): Simulate {
  return (def, build) => {
    const coldC = numberSetting(def, build, "cold", 10, 0, 100);
    const hotC = numberSetting(def, build, "hot", 60, 0, 100);

    const coldFinish = finishTime(coldC);
    const hotFinish = belief === "temperature-doesnt-matter" ? coldFinish : finishTime(hotC);
    const timeScale = Math.max(coldFinish, hotFinish) / SLOWER_DONE_AT;

    const timeline = makeTimeline((t) => {
      const clock = t * timeScale;
      const cold = tablet(coldFinish, clock);
      const hot = tablet(hotFinish, clock);
      return {
        "cold.remaining": cold.remaining,
        "hot.remaining": hot.remaining,
        "cold.bubbles": cold.bubbles,
        "hot.bubbles": hot.bubbles,
        clock,
      };
    });

    return {
      readings: { "cold.finish": coldFinish, "hot.finish": hotFinish, timeScale },
      faults: [],
      timeline,
    };
  };
}

export const simulateRate: Simulate = rateModel("real");

export const rateWrongModels: Record<string, Simulate> = {
  "temperature-doesnt-matter": rateModel("temperature-doesnt-matter"),
};
