import type { Simulate } from "../types";
import { makeTimeline, numberSetting, settle } from "./common";

/*
 * Stage "heat": what heating does to the particles of a gas.
 *
 * A sealed, stretchy balloon of air is warmed from 20 °C to the
 * `temperature` setting (°C).
 *
 * Assumptions (simplified, but honest):
 *  - Air is an ideal gas. The particles' average (rms) speed grows with the
 *    square root of the absolute temperature: speed ratio = √(T_end / T_start),
 *    temperatures in kelvin.
 *  - The balloon is sealed, so no particles get in or out, and it stretches
 *    easily, so the pressure inside stays about the same as outside. Then the
 *    volume grows in proportion to the kelvin temperature (Charles's law):
 *    volume ratio = T_end / T_start. (Real rubber pushes back a little; ignored.)
 *  - Heating never changes a particle's size or the number of particles.
 *  - Timing: the air warms Newton-style (quickly at first, then easing in)
 *    and reaches the target at t = 10 s. The balloon keeps up with the air
 *    temperature at every moment.
 *  - Temperatures are kept between −50 °C and 150 °C, where a rubber balloon
 *    of air makes sense (the slider runs 20–90 °C).
 *
 * Readings:
 *   temp.start, temp.end      °C (start is always 20)
 *   particles.speedRatio      average particle speed vs the start
 *   particles.sizeRatio       particle size vs the start (1)
 *   particles.countRatio      number of particles vs the start (1)
 *   balloon.volumeRatio       balloon volume vs the start
 * Timeline values: temperature (°C), speed, size, count, volume (ratios vs the start).
 *
 * Wrong models (the balloon still grows the same, because that's what the
 * student sees; the belief is about why):
 *   particles-expand      each particle swells as much as the balloon does
 *                         (size ratio = volume ratio) and none speed up.
 *   heat-adds-particles   heating makes new particles to fill the bigger
 *                         balloon (count ratio = volume ratio), none speed up.
 */

type Belief = "real" | "particles-expand" | "heat-adds-particles";

const START_C = 20;
const KELVIN = 273.15;
/** Seconds for the air to get most of the way to the target temperature. */
const WARM_TAU = 2;

function heatModel(belief: Belief): Simulate {
  return (def, build) => {
    const target = numberSetting(def, build, "temperature", 80, -50, 150);

    const ratios = (celsius: number) => {
      const volume = (celsius + KELVIN) / (START_C + KELVIN);
      return {
        volume,
        speed: belief === "real" ? Math.sqrt(volume) : 1,
        size: belief === "particles-expand" ? volume : 1,
        count: belief === "heat-adds-particles" ? volume : 1,
      };
    };

    const timeline = makeTimeline((t) => {
      const temperature = START_C + (target - START_C) * settle(t, WARM_TAU);
      return { temperature, ...ratios(temperature) };
    });

    const end = ratios(target);
    return {
      readings: {
        "temp.start": START_C,
        "temp.end": target,
        "particles.speedRatio": end.speed,
        "particles.sizeRatio": end.size,
        "particles.countRatio": end.count,
        "balloon.volumeRatio": end.volume,
      },
      faults: [],
      timeline,
    };
  };
}

export const simulateHeat: Simulate = heatModel("real");

export const heatWrongModels: Record<string, Simulate> = {
  "particles-expand": heatModel("particles-expand"),
  "heat-adds-particles": heatModel("heat-adds-particles"),
};
