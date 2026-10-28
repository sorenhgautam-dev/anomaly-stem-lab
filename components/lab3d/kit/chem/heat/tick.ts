import { Color } from "three";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { vfx, type Vec3 } from "../../vfx";
import { TONE } from "./tones";

/*
 * Small per-frame helpers for the heat stages, kept in class instances so
 * React never sees the mutation (CLAUDE.md §9): an eased value (the particle
 * zoom fading in), an emitter that turns a rate into whole spawns, the steam
 * and fizz VFX, and water tinted by its temperature.
 */

export class Ease {
  value = 0;
  /** Move toward `target` at about `rate` per second, eased. */
  to(target: number, dt: number, rate = 5): number {
    this.value += (target - this.value) * Math.min(1, dt * rate);
    return this.value;
  }
}

export class Emitter {
  private acc = 0;
  /** How many to spawn this frame for `perSecond`. */
  due(perSecond: number, dt: number): number {
    this.acc += Math.max(0, perSecond) * dt;
    const n = Math.floor(this.acc);
    this.acc -= n;
    return n;
  }
}

/** One soft wisp of steam rising off a water surface (white and pale sage, Chemistry's palette, DESIGN.md §8). */
export function steam(at: Vec3, spread: number): void {
  vfx.burst({ at, kind: "smoke", count: 1, colors: TONE.steam, speed: [0.08, 0.18], dir: [0, 1, 0], cone: 0.9, life: [1.4, 2.4], size: [0.04, 0.08], grow: 0.07, spread, drag: 0.5, gravity: -0.04 });
}

/** One fizz bubble rising from a tablet through `depth` of water. */
export function bubble(at: Vec3, depth: number, spread: number): void {
  vfx.burst({ at, kind: "bubble", count: 1, colors: [P.white, TONE.paleSage], speed: [0.25, 0.45], dir: [0, 1, 0], cone: 0.85, life: [depth * 2.2, depth * 3.2], size: [0.012, 0.026], spread, gravity: -0.25, drag: 1.5 });
}

// Water tints from cool sage (5 °C) through clear to warm sand gold (90 °C), precomputed so a getter can pick one each frame.
const COOL = new Color(LAB.chemistry.sage);
const CLEAR = new Color(P.white);
const WARM = new Color(LAB.chemistry.gold);
const TINTS = Array.from({ length: 17 }, (_, i) => `#${(i < 8 ? COOL.clone().lerp(CLEAR, i / 8) : CLEAR.clone().lerp(WARM, (i - 8) / 8)).getHexString()}`);

/** A water colour for `celsius`, from cool sage to warm sand gold. */
export function waterTint(celsius: number): string {
  return TINTS[Math.round(Math.max(0, Math.min(1, (celsius - 5) / 85)) * 16)];
}
