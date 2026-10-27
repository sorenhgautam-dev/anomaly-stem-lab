import { CatmullRomCurve3, CurvePath, LineCurve3, QuadraticBezierCurve3, Vector3, type Curve } from "three";
import { SLOT_LENGTH, type BoardSlot } from "@/engine/types";
import type { Pt } from "./board-geometry";

/*
 * Board space → bench space for circuits. The board (1000 × 600 board units,
 * engine/types.ts) lies flat on the bench: board x → world x, board y → world
 * z, with the board's centre at the bench centre.
 */

export const BOARD_SCALE = 0.0046;
/** Height of the board's top surface above the bench. */
export const BOARD_TOP = 0.07;
/** Height wires run at. */
export const WIRE_Y = BOARD_TOP + 0.035;

export function toWorld(p: Pt, y = WIRE_Y): Vector3 {
  return new Vector3((p.x - 500) * BOARD_SCALE, y, (p.y - 300) * BOARD_SCALE);
}

export interface SlotFrame {
  centre: Vector3;
  /** Rotation about Y that lays a part modelled along +X into the slot. */
  yaw: number;
  /** Half the distance between the slot's terminals, in world units. */
  half: number;
}

export function slotFrame(slot: BoardSlot): SlotFrame {
  return { centre: toWorld({ x: slot.x, y: slot.y }, BOARD_TOP), yaw: slot.orientation === "h" ? 0 : -Math.PI / 2, half: (SLOT_LENGTH / 2) * BOARD_SCALE };
}

/** A wire's route: straight runs with small rounded corners, like a bent jumper. */
export function wireCurve(points: Pt[], radius = 0.06): Curve<Vector3> {
  const pts = points.map((p) => toWorld(p));
  if (pts.length === 2) return new LineCurve3(pts[0], pts[1]);
  const path = new CurvePath<Vector3>();
  let from = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const corner = pts[i];
    const inDir = corner.clone().sub(pts[i - 1]).normalize();
    const outDir = pts[i + 1].clone().sub(corner).normalize();
    const r = Math.min(radius, corner.distanceTo(pts[i - 1]) / 2, corner.distanceTo(pts[i + 1]) / 2);
    const a = corner.clone().addScaledVector(inDir, -r);
    const b = corner.clone().addScaledVector(outDir, r);
    path.add(new LineCurve3(from, a));
    path.add(new QuadraticBezierCurve3(a, corner, b));
    from = b;
  }
  path.add(new LineCurve3(from, pts[pts.length - 1]));
  return path;
}

/** A gentle arc for a wire the student added (a jumper lifted off the board). */
export function jumperCurve(points: Pt[]): Curve<Vector3> {
  const a = toWorld(points[0]);
  const b = toWorld(points[points.length - 1]);
  const mid = a.clone().lerp(b, 0.5).setY(WIRE_Y + 0.25);
  return new CatmullRomCurve3([a, mid, b]);
}
