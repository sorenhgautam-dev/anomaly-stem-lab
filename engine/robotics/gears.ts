import type { Simulate, Simulation, TimelineFrame } from "../types";
import { clamp, numberSetting } from "./settings";

/*
 * Gears stage: a motor gear (the driver) meshed with an output gear (the driven).
 *
 * Settings: `driver`, `driven` = number of teeth (sliders 8..40).
 * The motor turns the driver at 60 rpm with torque 1 (relative units). Ideal
 * gears (no friction): the teeth pass at the same rate, so
 *   driven rpm    = 60 × driver teeth / driven teeth
 *   driven torque = 1 × driven teeth / driver teeth   (speed traded for torque)
 * and meshed gears turn in opposite directions (Lynch & Park, Modern Robotics
 * §8.9: an ideal gearhead cuts speed by the ratio and raises torque by it; real
 * gears lose a little torque to friction, which we leave out).
 *
 * Readings:
 *   driver.rpm, driver.torque   the motor gear (60, 1)
 *   driven.rpm                  output speed, magnitude
 *   driven.torque               output torque (relative)
 *   driven.direction            −1: turns the opposite way to the motor gear
 *   gear.ratio                  driven teeth ÷ driver teeth
 * timeline: 3 s at 30 frames per second, values
 *   driverAngle, drivenAngle    degrees turned since the start, + = counter-
 *                               clockwise (the motor gear turns counter-
 *                               clockwise). The renderer adds any offset it
 *                               needs to make the teeth mesh.
 */

export const MOTOR_RPM = 60;
export const MOTOR_TORQUE = 1;
export const GEAR_SECONDS = 3;
export const GEAR_FRAMES_PER_SECOND = 30;

/** How a model relates the output speed to the teeth: reality, or a belief. */
export type GearRule = "real" | "inverted" | "same";

export function turnGears(driverTeeth: number, drivenTeeth: number, rule: GearRule = "real"): Simulation {
  const driver = clamp(Math.round(driverTeeth), 4, 200);
  const driven = clamp(Math.round(drivenTeeth), 4, 200);
  const ratio = driven / driver;
  const speedFactor = rule === "real" ? 1 / ratio : rule === "inverted" ? ratio : 1;
  const drivenRpm = MOTOR_RPM * speedFactor;
  const drivenTorque = MOTOR_TORQUE / speedFactor;

  const timeline: TimelineFrame[] = [];
  for (let frame = 0; frame <= GEAR_SECONDS * GEAR_FRAMES_PER_SECOND; frame++) {
    const t = frame / GEAR_FRAMES_PER_SECOND;
    timeline.push({
      t,
      values: { driverAngle: (360 * MOTOR_RPM * t) / 60, drivenAngle: (-360 * drivenRpm * t) / 60 },
    });
  }
  return {
    readings: {
      "driver.rpm": MOTOR_RPM,
      "driver.torque": MOTOR_TORQUE,
      "driven.rpm": drivenRpm,
      "driven.torque": drivenTorque,
      "driven.direction": -1,
      "gear.ratio": ratio,
    },
    faults: [],
    timeline,
  };
}

const teeth = (...args: Parameters<Simulate>) => {
  const [def, build] = args;
  return [numberSetting(def, build, "driver", 12), numberSetting(def, build, "driven", 36)] as const;
};

export const realGears: Simulate = (def, build) => turnGears(...teeth(def, build));

/*
 * big-gear-faster   A bigger gear turns faster: the speed ratio is inverted
 *                   (driven rpm = 60 × driven / driver).
 * gears-keep-speed  Gears only change direction: driven rpm = motor rpm.
 */
export const gearWrongModels: Record<string, Simulate> = {
  "big-gear-faster": (def, build) => turnGears(...teeth(def, build), "inverted"),
  "gears-keep-speed": (def, build) => turnGears(...teeth(def, build), "same"),
};
