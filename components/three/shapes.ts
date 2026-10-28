import { PALETTE as P } from "@/lib/tokens";
import type { SpecimenKind } from "./specimens";

/*
 * Floating lab specimens you can knock around (DESIGN.md §2 "saturated 3D
 * objects", §9.1): flasks, beakers and test tubes of apricot liquid, LEDs,
 * AA cells, resistors, gears and water molecules (components/three/
 * specimens.ts models them), drifting slowly. The cursor pushes them away on
 * a spring, a fast swipe flings them, a click sends a shock out, and they
 * always float back home. Pure maths, no three.js objects, so it's testable;
 * components/three/ShapesField.tsx draws it.
 */

export type ShapeKind = SpecimenKind;

export const SHAPE_KINDS: ShapeKind[] = ["flask", "beaker", "tube", "led", "cell", "resistor", "gear", "molecule", "sphere"];

/** Rough radius of each kind at scale 1, for collisions with the cursor. */
const RADIUS: Record<ShapeKind, number> = { flask: 0.95, beaker: 0.9, tube: 1, led: 0.95, cell: 0.9, resistor: 0.95, gear: 0.95, molecule: 0.9, sphere: 1 };

export interface ShapeSpec {
  kind: ShapeKind;
  /** The colour of its liquid or accent part (the LED's lens, the cell's band, the gear…) when the field has no palette. */
  color: string;
  /** Which of the field's palette colours it takes, when the field has one. */
  tone?: "a" | "b";
  /** Home across the view, -1…1 (left to right, bottom to top). */
  x: number;
  y: number;
  /** Depth: negative is further away. */
  z: number;
  /** Size in world units. */
  s: number;
  /** Starting rotation (radians), so no two face the same way. */
  r?: [number, number, number];
}

/*
 * Layouts per place. Specimens hug the edges and sit behind the giant
 * headline, never under body text or Ano. Phones get the first few only.
 */
export const LAYOUTS: Record<"hero" | "cta", ShapeSpec[]> = {
  hero: [
    { kind: "flask", color: P.apricot[400], tone: "a", x: -0.66, y: 0.5, z: -3, s: 1.05, r: [0.3, 0.6, 0.35] },
    { kind: "led", color: P.white, tone: "b", x: 0.62, y: 0.66, z: -2.4, s: 0.66, r: [0.4, 0.2, 0.9] },
    { kind: "gear", color: P.apricot[500], tone: "a", x: -0.93, y: -0.12, z: -0.6, s: 0.5, r: [0.9, 0.3, 0] },
    { kind: "beaker", color: P.apricot[500], tone: "b", x: 0.94, y: 0.1, z: -0.8, s: 0.52, r: [0.3, 0.7, -0.25] },
    { kind: "cell", color: P.white, tone: "a", x: 0.8, y: -0.34, z: 0.4, s: 0.3, r: [0.3, 0.2, 1.2] },
    { kind: "molecule", color: P.white, tone: "b", x: -0.82, y: 0.22, z: 0.6, s: 0.32, r: [0.2, 0.1, -0.7] },
    { kind: "resistor", color: P.white, tone: "a", x: -0.38, y: 0.86, z: -1.2, s: 0.28, r: [0.3, 0.2, 1.2] },
    { kind: "gear", color: P.white, tone: "b", x: 1.02, y: -0.2, z: -3.2, s: 0.48, r: [0.6, 0.9, 0] },
    { kind: "tube", color: P.apricot[300], tone: "a", x: -0.97, y: 0.76, z: -2, s: 0.4, r: [0.3, 0.4, 0.7] },
    { kind: "cell", color: P.white, tone: "b", x: 0.97, y: 0.64, z: -1.4, s: 0.34, r: [0.3, 0.2, -0.9] },
    { kind: "molecule", color: P.white, tone: "a", x: 0.55, y: -0.18, z: -3.4, s: 0.42, r: [1.2, 0, 0.4] },
    { kind: "led", color: P.white, tone: "b", x: -0.56, y: -0.2, z: -3.2, s: 0.38, r: [0.3, 0.2, -0.6] },
  ],
  cta: [
    { kind: "gear", color: P.apricot[400], tone: "a", x: -0.72, y: 0.62, z: -1.6, s: 0.62, r: [1, 0.4, 0] },
    { kind: "flask", color: P.apricot[300], tone: "b", x: 0.96, y: 0.86, z: -2.2, s: 0.56, r: [0.3, 0.6, 0.3] },
    { kind: "led", color: P.white, tone: "b", x: -0.9, y: -0.4, z: -0.4, s: 0.44, r: [0.3, 0.2, 0.9] },
    { kind: "beaker", color: P.apricot[500], tone: "a", x: 0.9, y: -0.36, z: -0.6, s: 0.44, r: [0.4, 0.5, 0.2] },
    { kind: "cell", color: P.white, tone: "a", x: -0.34, y: 0.86, z: -2.8, s: 0.32, r: [0.3, 0.2, 0.9] },
    { kind: "molecule", color: P.white, tone: "b", x: 0.4, y: -0.8, z: -1.4, s: 0.28, r: [0.3, 0.2, 0.9] },
  ],
};

/** How many of a layout's specimens phones get. */
export const COMPACT_COUNT: Record<keyof typeof LAYOUTS, number> = { hero: 4, cta: 4 };

/** The camera every shapes view uses. */
export const SHAPES_CAMERA = { z: 10, fov: 30 };
const TAN = Math.tan(((SHAPES_CAMERA.fov / 2) * Math.PI) / 180);

/** Half the visible height at depth z. */
export function halfHeightAt(z: number): number {
  return (SHAPES_CAMERA.z - z) * TAN;
}

interface Body {
  spec: ShapeSpec;
  phase: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  rot: [number, number, number];
  spin: [number, number, number];
  /** Where the shape is now, in world units, and its drawn size (written by step). */
  wx: number;
  wy: number;
  size: number;
}

export interface PointerSample {
  /** -1…1 across the view, or null when the pointer is away. */
  nx: number | null;
  ny: number | null;
  /** A click inside the view since the last step, in view coordinates. */
  click: { nx: number; ny: number } | null;
}

/** Home spring: slow and floaty, so a shove carries before it settles. */
const K = 6.5;
const C = 3;

export class ShapeSim {
  bodies: Body[];
  private t = 0;
  private lastNx: number | null = null;
  private lastNy: number | null = null;

  constructor(specs: ShapeSpec[]) {
    this.bodies = specs.map((spec, i) => ({
      spec,
      phase: i * 1.7,
      px: 0,
      py: 0,
      vx: 0,
      vy: 0,
      rot: spec.r ? [...spec.r] : [i * 0.7, i * 1.3, 0],
      spin: [0.05 + (i % 3) * 0.04, 0.08 + (i % 4) * 0.03, 0.02],
      wx: 0,
      wy: 0,
      size: spec.s,
    }));
  }

  /** Advance by dt seconds. `aspect` is the view's width / height. */
  step(dt: number, aspect: number, ptr: PointerSample): void {
    this.t += dt;
    const { nx, ny } = ptr;
    // Cursor speed in view units per second, for flings.
    const svx = nx !== null && this.lastNx !== null && dt > 0 ? (nx - this.lastNx) / dt : 0;
    const svy = ny !== null && this.lastNy !== null && dt > 0 ? (ny - this.lastNy) / dt : 0;
    this.lastNx = nx;
    this.lastNy = ny;
    // Narrower views get smaller shapes, so they never loom over a phone screen.
    const fit = Math.min(1, Math.max(0.5, aspect / 1.6));

    for (const b of this.bodies) {
      const hh = halfHeightAt(b.spec.z);
      const hw = hh * aspect;
      // Home, with a slow idle drift.
      const hx = b.spec.x * hw + Math.cos(this.t * 0.4 + b.phase) * 0.1;
      const hy = b.spec.y * hh + Math.sin(this.t * 0.55 + b.phase) * 0.18;
      let ax = -K * b.px - C * b.vx;
      let ay = -K * b.py - C * b.vy;
      const x = hx + b.px;
      const y = hy + b.py;
      b.size = b.spec.s * fit;
      const reach = RADIUS[b.spec.kind] * b.size + 0.7;

      if (nx !== null && ny !== null) {
        const dx = x - nx * hw;
        const dy = y - ny * hh;
        const d = Math.hypot(dx, dy) || 1e-4;
        if (d < reach) {
          const f = (1 - d / reach) ** 2;
          ax += (dx / d) * f * 46;
          ay += (dy / d) * f * 46;
          // A fast swipe carries the shape along with it.
          b.vx += svx * hw * f * 0.06;
          b.vy += svy * hh * f * 0.06;
          b.spin[0] += -dy * f * dt * 6;
          b.spin[1] += dx * f * dt * 6;
        }
      }
      if (ptr.click) {
        const dx = x - ptr.click.nx * hw;
        const dy = y - ptr.click.ny * hh;
        const d = Math.hypot(dx, dy) || 1e-4;
        const blast = reach * 3;
        if (d < blast) {
          const f = 1 - d / blast;
          b.vx += (dx / d) * f * 7;
          b.vy += (dy / d) * f * 7;
          b.spin[2] += f * 2;
        }
      }

      b.vx += ax * dt;
      b.vy += ay * dt;
      b.px += b.vx * dt;
      b.py += b.vy * dt;
      // Spin decays back to a slow idle turn.
      for (let k = 0; k < 3; k++) {
        const idle = k === 2 ? 0.02 : 0.06 + ((b.phase + k) % 1) * 0.05;
        b.spin[k] += (idle - b.spin[k]) * Math.min(1, dt * 1.2);
        b.rot[k] += b.spin[k] * dt;
      }
      b.wx = hx + b.px;
      b.wy = hy + b.py;
    }
  }
}
