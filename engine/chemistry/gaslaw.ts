import type { Simulate } from "../types";
import { makeTimeline, numberSetting, smoothstep } from "./common";

/*
 * Stage "gaslaw": squeezing a gas (experiment "Gas laws (PV = nRT)").
 *
 * A syringe holds 60 mL of air at room pressure, its tip sealed. The plunger
 * is pushed in to the `volume` setting (mL).
 *
 * Assumptions (simplified, but honest):
 *  - Air behaves as an ideal gas, PV = nRT. The syringe is sealed (n fixed)
 *    and pushed slowly, so the air stays at 20 °C (T fixed). Then P × V stays
 *    constant: Boyle's law, P₂ = P₁ × V₁ / V₂. (A fast squeeze would warm the
 *    air and raise the pressure a little more; not modelled.)
 *  - Room pressure is 101.325 kPa. No air leaks past the plunger.
 *  - `hits` is how often particles hit each square centimetre of wall,
 *    compared with the start. At the same temperature every hit gives the same
 *    push, so it rises in step with the pressure.
 *  - The plunger stops at 5 mL (and the syringe holds 100 mL at most).
 *  - Timing: the plunger moves from t = 0.5 s to t = 5.5 s, then is held.
 *
 * Readings:
 *   volume.start, volume.end       mL
 *   pressure.start, pressure.end   kPa (absolute)
 *   pressure.ratio                 pressure.end / pressure.start
 *   pv.ratio                       (P × V) at the end / (P × V) at the start (1 for Boyle's law)
 * Timeline values: volume (mL), pressure (kPa), hits (wall hits vs the start).
 *
 * Wrong models:
 *   pressure-ignores-volume   it's the same gas, so its pressure doesn't
 *                             change however small the space.
 *   pressure-follows-volume   less space means less pressure: pressure
 *                             shrinks in step with the volume.
 */

type Belief = "real" | "pressure-ignores-volume" | "pressure-follows-volume";

const START_ML = 60;
const ROOM_KPA = 101.325;
const PUSH_FROM = 0.5;
const PUSH_TO = 5.5;

function pressureAt(belief: Belief, ml: number): number {
  if (belief === "pressure-ignores-volume") return ROOM_KPA;
  if (belief === "pressure-follows-volume") return (ROOM_KPA * ml) / START_ML;
  return (ROOM_KPA * START_ML) / ml;
}

function gaslawModel(belief: Belief): Simulate {
  return (def, build) => {
    const end = numberSetting(def, build, "volume", 30, 5, 100);
    const pressure = pressureAt(belief, end);

    const timeline = makeTimeline((t) => {
      const volume = START_ML + (end - START_ML) * smoothstep(PUSH_FROM, PUSH_TO, t);
      const now = pressureAt(belief, volume);
      return { volume, pressure: now, hits: now / ROOM_KPA };
    });

    return {
      readings: {
        "volume.start": START_ML,
        "volume.end": end,
        "pressure.start": ROOM_KPA,
        "pressure.end": pressure,
        "pressure.ratio": pressure / ROOM_KPA,
        "pv.ratio": (pressure * end) / (ROOM_KPA * START_ML),
      },
      faults: [],
      timeline,
    };
  };
}

export const simulateGaslaw: Simulate = gaslawModel("real");

export const gaslawWrongModels: Record<string, Simulate> = {
  "pressure-ignores-volume": gaslawModel("pressure-ignores-volume"),
  "pressure-follows-volume": gaslawModel("pressure-follows-volume"),
};
