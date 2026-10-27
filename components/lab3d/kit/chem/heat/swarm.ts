import { Color, type InstancedMesh, Object3D } from "three";
import { mulberry32 } from "@/lib/random";
import { bounce } from "./walls";

/*
 * The molecule views of the heat stages (DESIGN.md §8.1 "zoom to
 * particles", CLAUDE.md §6.5): each particle either sits in its lattice home
 * (a solid, jiggling a little more when warmer) or flies free and bounces off
 * its container (a liquid or a gas, walls.ts). Trail dots behind each free particle
 * make its speed readable even in a still frame. Stepped on the CPU into one
 * InstancedMesh, and only ever changed through its own methods.
 */

/** Changes drawn this many times larger than life, so a 10 % speed-up reads on screen (readouts give the true ratios). */
export const AMP = 4;
export const amp = (ratio: number) => Math.max(0.2, 1 + (ratio - 1) * AMP);

export interface SwarmFrame {
  /** Particles shown. */
  count: number;
  /** Flight speed, units per second. */
  speed: number;
  /** Particle radius. */
  size: number;
  /** Share still locked in the lattice, 0..1 (outer particles break free first). */
  order: number;
  /** Container: a sphere of `radius` (height 0), or a cylinder of `radius` and `height` standing on y = 0. */
  radius: number;
  height: number;
  /** 0..1 grow-in (0 hides the swarm). */
  show: number;
}

const tmp = new Object3D();
const tint = new Color();
const fade = new Color();

export class Swarm {
  readonly stride: number;
  private pos: Float32Array;
  private dir: Float32Array;
  private home: Float32Array | null;
  private keep: Float32Array;
  /** Each particle's own speed factor (a spread of speeds, like a real gas). */
  private pace: Float32Array;
  private rand: () => number;
  private placed = false;
  private f: SwarmFrame = { count: 0, speed: 0, size: 0, order: 0, radius: 0.1, height: 0, show: 1 };

  /** `homes`: lattice positions (x, y, z per particle), or null for a gas. `wander`: how fast directions drift (a liquid jostles). */
  constructor(
    readonly max: number,
    readonly trail: number,
    homes: Float32Array | null,
    seed: number,
    private wander = 0,
  ) {
    this.stride = 1 + trail;
    this.pos = new Float32Array(max * 3);
    this.dir = new Float32Array(max * 3);
    this.home = homes;
    this.keep = new Float32Array(max);
    this.pace = new Float32Array(max);
    this.rand = mulberry32(seed);
    for (let i = 0; i < max; i++) {
      this.turn(i, 1);
      this.pace[i] = 0.55 + this.rand() * 0.9;
    }
    if (homes) {
      // Rank by distance from the lattice centre: the outside melts first.
      const d = Array.from({ length: max }, (_, i) => Math.hypot(homes[i * 3], homes[i * 3 + 1] - centreY(homes), homes[i * 3 + 2]) + this.rand() * 0.01);
      const order = d.map((_, i) => i).sort((a, b) => d[a] - d[b]);
      order.forEach((i, rank) => (this.keep[i] = 0.02 + (0.95 * rank) / Math.max(1, max - 1)));
    }
  }

  /** Paint the particles and their fading trail dots once. */
  paint(mesh: InstancedMesh, color: string, trailColor: string): void {
    fade.set(trailColor);
    for (let i = 0; i < this.max; i++) {
      for (let j = 0; j < this.stride; j++) {
        tint.set(color).lerp(fade, j === 0 ? 0 : 0.35 + (0.5 * j) / this.stride);
        mesh.setColorAt(i * this.stride + j, tint);
      }
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  /** One frame: the values (see SwarmFrame), then seconds since the last frame and the clock. */
  step(mesh: InstancedMesh, count: number, speed: number, size: number, order: number, radius: number, height: number, show: number, dt: number, time: number): void {
    const f = this.f;
    f.count = count;
    f.speed = speed;
    f.size = size;
    f.order = order;
    f.radius = radius;
    f.height = height;
    f.show = show;
    const n = Math.max(0, Math.min(this.max, Math.round(f.count)));
    mesh.visible = f.show > 0.01 && n > 0;
    if (!mesh.visible) return;
    if (!this.placed) this.place(f);
    mesh.count = n * this.stride;
    const dot = f.size * f.show;
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      const bound = this.home !== null && f.order >= this.keep[i];
      if (bound) {
        // Ease back home (also on rewind), then jiggle in place.
        const h = this.home!;
        const k = Math.min(1, dt * 7);
        const jig = 0.05 * f.speed;
        for (let a = 0; a < 3; a++) this.pos[o + a] += (h[o + a] + Math.sin(time * 19 + i * 3.1 + a * 2) * jig - this.pos[o + a]) * k;
      } else {
        if (this.wander > 0) this.turn(i, this.wander * dt);
        for (let a = 0; a < 3; a++) this.pos[o + a] += this.dir[o + a] * f.speed * this.pace[i] * dt;
        bounce(this.pos, this.dir, i * 3, f.radius - f.size, f.height, f.size);
      }
      for (let j = 0; j < this.stride; j++) {
        const back = bound ? 0 : j * 0.045 * f.speed * this.pace[i];
        tmp.position.set(this.pos[o] - this.dir[o] * back, this.pos[o + 1] - this.dir[o + 1] * back, this.pos[o + 2] - this.dir[o + 2] * back);
        tmp.scale.setScalar(bound && j > 0 ? 0 : dot * (1 - 0.3 * j));
        tmp.updateMatrix();
        mesh.setMatrixAt(i * this.stride + j, tmp.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  /** Start every free particle somewhere inside the container. */
  private place(f: SwarmFrame) {
    this.placed = true;
    for (let i = 0; i < this.max; i++) {
      const o = i * 3;
      if (this.home) {
        this.pos.set([this.home[o], this.home[o + 1], this.home[o + 2]], o);
        continue;
      }
      // A random point in the unit ball (not along the particle's own direction, or every path would be radial).
      let x = 1;
      let y = 1;
      let z = 1;
      while (x * x + y * y + z * z > 1) {
        x = this.rand() * 2 - 1;
        y = this.rand() * 2 - 1;
        z = this.rand() * 2 - 1;
      }
      const r = f.radius * 0.9;
      this.pos.set([x * r, f.height > 0 ? (y * 0.5 + 0.5) * f.height : y * r, z * r], o);
    }
  }

  /** Nudge (or set, k = 1) a particle's direction, kept unit length. */
  private turn(i: number, k: number) {
    const o = i * 3;
    let x = this.dir[o] * (1 - k) + (this.rand() * 2 - 1) * k;
    let y = this.dir[o + 1] * (1 - k) + (this.rand() * 2 - 1) * k;
    let z = this.dir[o + 2] * (1 - k) + (this.rand() * 2 - 1) * k;
    const l = Math.hypot(x, y, z) || 1;
    x /= l;
    y /= l;
    z /= l;
    this.dir[o] = x;
    this.dir[o + 1] = y;
    this.dir[o + 2] = z;
  }
}

function centreY(homes: Float32Array): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 1; i < homes.length; i += 3) {
    lo = Math.min(lo, homes[i]);
    hi = Math.max(hi, homes[i]);
  }
  return (lo + hi) / 2;
}

/** A cubic ice-like lattice of nx × ny × nz homes, `gap` apart, centred on x/z and starting at y = `base`. */
export function lattice(nx: number, ny: number, nz: number, gap: number, base: number): Float32Array {
  const out = new Float32Array(nx * ny * nz * 3);
  let k = 0;
  for (let y = 0; y < ny; y++)
    for (let z = 0; z < nz; z++)
      for (let x = 0; x < nx; x++) {
        // Alternate layers sit half a gap over, like a stacked crystal.
        const shift = (y % 2) * gap * 0.5;
        out.set([(x - (nx - 1) / 2) * gap + shift * 0.5, base + y * gap * 0.9, (z - (nz - 1) / 2) * gap + shift * 0.5], k);
        k += 3;
      }
  return out;
}
