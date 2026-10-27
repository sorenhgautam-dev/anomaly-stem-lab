import { Vector3 } from "three";
import type { Point } from "@/engine/types";

/*
 * The robot arena's space (engine/robotics/kinematics.ts): arena units are
 * cm with x to the right and y "north", the robot starting at (0, 0) facing
 * north. On the bench, north runs away from the camera (−Z), so the robot's
 * left is the screen's left. The mat covers every path the sliders allow
 * (|x| ≤ ~48 cm, −15 ≤ y ≤ 80 cm) with room for the robot's body.
 */

/** World units per cm. */
export const ARENA_SCALE = 0.02;
/** World Z of the start point (the mat runs back from here). */
export const START_Z = 0.5;
/** Height of the mat's surface above the bench top. */
export const MAT_TOP = 0.062;
/** The mat's extent in arena cm. */
export const MAT = { minX: -56, maxX: 56, minY: -22, maxY: 84 };

export function arenaToWorld(p: Point, out = new Vector3(), lift = 0): Vector3 {
  return out.set(p.x * ARENA_SCALE, MAT_TOP + lift, START_Z - p.y * ARENA_SCALE);
}

/** Mat size and centre in world units. */
export function matFrame() {
  const width = (MAT.maxX - MAT.minX) * ARENA_SCALE;
  const depth = (MAT.maxY - MAT.minY) * ARENA_SCALE;
  const cx = ((MAT.minX + MAT.maxX) / 2) * ARENA_SCALE;
  const cz = START_Z - ((MAT.minY + MAT.maxY) / 2) * ARENA_SCALE;
  return { width, depth, cx, cz };
}

/** Put an object at arena (x, y) cm on the mat, turned `headingDeg` (+ = counter-clockwise, as in the engine). */
export function placeOnArena(obj: { position: Vector3; rotation: { y: number } }, x: number, y: number, headingDeg: number): void {
  obj.position.set(x * ARENA_SCALE, MAT_TOP, START_Z - y * ARENA_SCALE);
  obj.rotation.y = (headingDeg * Math.PI) / 180;
}
