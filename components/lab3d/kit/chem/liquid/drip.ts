import { vfx, type Vec3 } from "../../vfx";

/*
 * Drops, grains and splashes for the liquid stages (DESIGN.md §8.1 "pouring
 * liquid", "colour-change swirls"), on the pooled VFX: a drop falls from
 * `from` and fades just as it reaches the surface `fall` below, where a soft
 * splash blooms. A Spawner turns a growing total (drops so far, from the
 * simulator's values) into whole drops, so pausing or rewinding spawns none.
 */

const G = 3.2;

/** One falling drop (or grain) from `from`, landing `fall` lower with a small splash in `splash`. */
export function drip(from: Vec3, fall: number, color: string, splash = color, size = 0.02): void {
  const life = Math.sqrt((2 * Math.max(0.02, fall)) / G);
  vfx.burst({ at: from, kind: "bubble", count: 1, colors: [color], speed: [0.01, 0.03], dir: [0, -1, 0], cone: 1, life: [life, life], size: [size, size * 1.15], gravity: G, drag: 0 });
  vfx.burst({ at: [from[0], from[1] - fall + 0.01, from[2]], kind: "glow", count: 2, colors: [splash], speed: [0.05, 0.16], dir: [0, 1, 0], cone: 0.2, life: [0.35, 0.6], size: [0.05, 0.09], drag: 3, delay: life });
}

/** Turns a running total into whole spawns. A class, so per-frame state never touches React. */
export class Spawner {
  private last = 0;
  /** How many to spawn now that the total has reached `total` (none when it falls: a rewind). */
  next(total: number): number {
    const n = total > this.last ? Math.floor(total) - Math.floor(this.last) : 0;
    this.last = total;
    return n;
  }
}
