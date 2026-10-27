import { PALETTE as P } from "@/lib/tokens";
import { vfx } from "../vfx";

/*
 * Tiny sparks at a motor's brushes while it turns (DESIGN.md §8.1 VFX
 * "sparks", used sparingly): a few pooled sparks every quarter second or so.
 * Keep one per motor (useState(() => new BrushSparks())) and step it each frame.
 */

export class BrushSparks {
  private wait = 0;
  step(dt: number, on: boolean, at: [number, number, number]): void {
    this.wait -= dt;
    if (!on || this.wait > 0) return;
    this.wait = 0.28 + Math.random() * 0.25;
    vfx.burst({ at, kind: "spark", count: 3, colors: [P.apricot[300], P.white], speed: [0.4, 0.9], dir: [0, 1, -0.4], cone: 0.5, life: [0.12, 0.25], size: [0.006, 0.01], gravity: 3, drag: 1 });
  }
}
