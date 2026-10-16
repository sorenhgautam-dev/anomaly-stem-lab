import type { Simulate } from "../types";
import { makeTimeline, numberSetting, RUN_SECONDS } from "./common";

/*
 * Stage "melt": what the thermometer does while ice melts
 * (experiment "Melting and particles").
 *
 * 100 g of ice at −10 °C in a beaker is heated at a steady power (the
 * `power` setting, watts) for 380 s. The display run of 10 s shows those
 * 380 real seconds; `clock` gives real seconds.
 *
 * Assumptions (simplified, but honest):
 *  - All of the heater's energy goes into the beaker's contents: no heat
 *    lost to the room, no evaporation. The mixture is stirred, so the
 *    thermometer reads the same everywhere.
 *  - Ice warms at 2.09 J per gram per °C, liquid water at 4.18 J/g·°C, and
 *    melting takes 334 J per gram (6.01 kJ/mol) with no change in
 *    temperature. So the thermometer climbs to 0 °C, stays at exactly 0 °C
 *    while there is still ice, then climbs again (a heating curve).
 *  - The model covers 100–200 W (the slider). Across that range the ice
 *    always melts within the 380 s and the water stays below boiling; other
 *    powers are clamped to it.
 *  - Particle speed (rms) grows with the square root of the kelvin
 *    temperature, compared with the start at −10 °C. On the plateau the
 *    energy goes into breaking particles out of the lattice, not into speed.
 *  - `order` is the share of particles still locked in the ice lattice
 *    (1 = all lattice, 0 = all liquid jumble). It equals the solid fraction.
 *
 * Readings:
 *   temp.start        °C at the start (−10)
 *   temp.duringMelt   average °C while the ice is melting
 *   temp.meltChange   °C change from when melting starts to when it ends
 *   temp.end          °C at the end of the run
 *   melt.fraction     share of the ice melted by the end, 0..1
 * Timeline values: temperature (°C), solid (1 → 0), speed (ratio vs the
 *   start), order (1 = lattice, 0 = liquid), clock (real seconds).
 *
 * Wrong model:
 *   melting-temp-rises   heating always raises the temperature, so the
 *                        thermometer never pauses: it climbs in a straight
 *                        line from 0 °C (when melting starts) to the same
 *                        final temperature as reality. The ice melts at the
 *                        same pace; only the thermometer differs.
 */

type Belief = "real" | "melting-temp-rises";

const ICE_G = 100;
const START_C = -10;
/** Specific heats, J per gram per °C. */
const ICE_HEAT = 2.09;
const WATER_HEAT = 4.18;
/** Energy to melt one gram of ice, J. */
const FUSION = 334;
/** Real seconds of heating shown over the 10 s run. */
const HEATING_S = 380;
const KELVIN = 273.15;

/** Energy to warm the ice to 0 °C, then to melt it all. */
const WARM_J = ICE_G * ICE_HEAT * (0 - START_C);
const MELT_J = ICE_G * FUSION;

function meltModel(belief: Belief): Simulate {
  return (def, build) => {
    const power = numberSetting(def, build, "power", 150, 100, 200);

    /** The real heating curve after `s` real seconds. */
    const actual = (s: number) => {
      const energy = power * s;
      if (energy <= WARM_J) return { temperature: START_C + energy / (ICE_G * ICE_HEAT), solid: 1 };
      if (energy <= WARM_J + MELT_J) return { temperature: 0, solid: 1 - (energy - WARM_J) / MELT_J };
      return { temperature: (energy - WARM_J - MELT_J) / (ICE_G * WATER_HEAT), solid: 0 };
    };

    const meltStart = WARM_J / power;
    const meltEnd = Math.min((WARM_J + MELT_J) / power, HEATING_S);
    const endC = actual(HEATING_S).temperature;

    const temperatureAt = (s: number) => {
      if (belief === "real" || s <= meltStart) return actual(s).temperature;
      // The belief: no pause, just a steady climb from 0 °C to the same end temperature.
      return (endC * (s - meltStart)) / (HEATING_S - meltStart);
    };

    // Average over the melting window (midpoint rule; exact for straight lines).
    const SLICES = 100;
    let sum = 0;
    for (let i = 0; i < SLICES; i++) sum += temperatureAt(meltStart + ((i + 0.5) * (meltEnd - meltStart)) / SLICES);

    const timeline = makeTimeline((t) => {
      const s = (t * HEATING_S) / RUN_SECONDS;
      const temperature = temperatureAt(s);
      const { solid } = actual(s);
      return {
        temperature,
        solid,
        speed: Math.sqrt((temperature + KELVIN) / (START_C + KELVIN)),
        order: solid,
        clock: s,
      };
    });

    return {
      readings: {
        "temp.start": START_C,
        "temp.duringMelt": sum / SLICES,
        "temp.meltChange": temperatureAt(meltEnd) - temperatureAt(meltStart),
        "temp.end": temperatureAt(HEATING_S),
        "melt.fraction": 1 - actual(HEATING_S).solid,
      },
      faults: [],
      timeline,
    };
  };
}

export const simulateMelt: Simulate = meltModel("real");

export const meltWrongModels: Record<string, Simulate> = {
  "melting-temp-rises": meltModel("melting-temp-rises"),
};
