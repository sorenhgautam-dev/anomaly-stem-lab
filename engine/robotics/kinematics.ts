import type { Point, Simulate, Simulation, TimelineFrame } from "../types";
import { clamp, numberSetting } from "./settings";

/*
 * Robot stage: a two-wheeled, differential-drive robot (CLAUDE.md §6.4).
 *
 * Settings: `left`, `right` = % of the top wheel speed (20 cm/s), −100..100.
 *   v = (vL + vR) / 2,  ω = (vR − vL) / L,  wheelbase L = 12 cm.
 * Drives for 4 s, integrated at 60 Hz from (0, 0) facing +y ("north").
 * Arena units are cm, x to the right, y up. Each step follows the exact arc
 * for that step, so the path is exact for constant wheel speeds. Kinematics as
 * in Columbia CS W4733 "Differential Drive Robots" notes (after Dudek & Jenkin):
 * equal speeds go straight, and the robot turns toward the slower wheel.
 *
 * Readings:
 *   robot.turn      heading change in degrees, + = left (counter-clockwise)
 *   robot.distance  cm travelled along the path
 *   robot.endX, robot.endY   where it stops (cm)
 * path: a point every 1/30 s (121 points, start and end included).
 * timeline: a frame every 1/30 s with values
 *   x, y     position (cm)
 *   heading  degrees turned from north, + = counter-clockwise, not wrapped
 */

export const MAX_WHEEL_SPEED = 20;
export const WHEELBASE = 12;
export const DRIVE_SECONDS = 4;
export const STEPS_PER_SECOND = 60;
const RECORD_EVERY = 2;

const degrees = (rad: number) => (rad * 180) / Math.PI;

export interface DriveOptions {
  /** Flip the sign of the turn rate (the turns-toward-faster-wheel belief). */
  mirrorTurn?: boolean;
}

export function drive(leftPercent: number, rightPercent: number, options: DriveOptions = {}): Simulation {
  const vL = (clamp(leftPercent, -100, 100) / 100) * MAX_WHEEL_SPEED;
  const vR = (clamp(rightPercent, -100, 100) / 100) * MAX_WHEEL_SPEED;
  const v = (vL + vR) / 2;
  const omega = ((vR - vL) / WHEELBASE) * (options.mirrorTurn ? -1 : 1);
  const dt = 1 / STEPS_PER_SECOND;

  let x = 0;
  let y = 0;
  let heading = 0;
  let distance = 0;
  const path: Point[] = [{ x, y }];
  const timeline: TimelineFrame[] = [{ t: 0, values: { x, y, heading } }];
  for (let step = 1; step <= DRIVE_SECONDS * STEPS_PER_SECOND; step++) {
    const next = heading + omega * dt;
    // Direction of travel at heading h is (−sin h, cos h).
    if (Math.abs(omega) < 1e-12) {
      x -= v * Math.sin(heading) * dt;
      y += v * Math.cos(heading) * dt;
    } else {
      x += (v / omega) * (Math.cos(next) - Math.cos(heading));
      y += (v / omega) * (Math.sin(next) - Math.sin(heading));
    }
    heading = next;
    distance += Math.abs(v) * dt;
    if (step % RECORD_EVERY === 0) {
      path.push({ x, y });
      timeline.push({ t: step / STEPS_PER_SECOND, values: { x, y, heading: degrees(heading) } });
    }
  }
  return {
    readings: { "robot.turn": degrees(heading), "robot.distance": distance, "robot.endX": x, "robot.endY": y },
    faults: [],
    path,
    timeline,
  };
}

const wheels = (...args: Parameters<Simulate>) => {
  const [def, build] = args;
  return [numberSetting(def, build, "left", 0), numberSetting(def, build, "right", 0)] as const;
};

export const realRobot: Simulate = (def, build) => drive(...wheels(def, build));

/** turns-toward-faster-wheel: the robot turns toward its faster wheel (the turn is mirrored). */
export const robotWrongModels: Record<string, Simulate> = {
  "turns-toward-faster-wheel": (def, build) => drive(...wheels(def, build), { mirrorTurn: true }),
};
