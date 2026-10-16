/*
 * The VFX layer's simulation (CLAUDE.md §3.6.4): pooled particles, shockwave
 * rings, light flashes and electric arcs in screen pixels. Pure TypeScript,
 * no React: lib/fx/draw.ts paints it, components/fx/FxLayer.tsx owns the
 * canvas and the frame loop, and lib/fx/index.ts turns lab events into
 * effects.
 */

export type ParticleKind = "spark" | "glow" | "smoke" | "confetti" | "shard";

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  grow: number;
  rot: number;
  spin: number;
  drag: number;
  gravity: number;
  color: string;
  alpha: number;
}

export interface Ring {
  x: number;
  y: number;
  from: number;
  to: number;
  age: number;
  life: number;
  color: string;
  width: number;
  broken: boolean;
}

export interface Flash {
  x: number;
  y: number;
  radius: number;
  age: number;
  life: number;
  color: string;
}

export interface Arc {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  age: number;
  life: number;
  color: string;
  jag: number;
}

export interface BurstOptions {
  x: number;
  y: number;
  count: number;
  kind: ParticleKind;
  colors: readonly string[];
  /** Launch speed range in px/s. */
  speed: [number, number];
  /** Launch angle range in radians (0 = right, −π/2 = up). Default: all round. */
  angle?: [number, number];
  /** Lifetime range in seconds. */
  life: [number, number];
  size: [number, number];
  /** px/s², positive pulls down. */
  gravity?: number;
  /** Velocity lost per second (0 = none). */
  drag?: number;
  /** Spawn anywhere within this radius of (x, y). */
  spread?: number;
  /** Size change per second (smoke swells). */
  grow?: number;
  spin?: number;
  alpha?: number;
  /** Seconds before the particles appear. */
  delay?: number;
}

export interface RingOptions {
  x: number;
  y: number;
  from: number;
  to: number;
  life: number;
  color: string;
  width?: number;
  /** A broken, flickering ring (the ANOMALY version). */
  broken?: boolean;
  delay?: number;
}

const MAX_PARTICLES = 1400;

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Axis-aligned box of everything drawn this frame, so the next frame only clears that. */
export class Bounds {
  x0 = Infinity;
  y0 = Infinity;
  x1 = -Infinity;
  y1 = -Infinity;
  add(x: number, y: number, r: number) {
    if (x - r < this.x0) this.x0 = x - r;
    if (y - r < this.y0) this.y0 = y - r;
    if (x + r > this.x1) this.x1 = x + r;
    if (y + r > this.y1) this.y1 = y + r;
  }
  reset() {
    this.x0 = this.y0 = Infinity;
    this.x1 = this.y1 = -Infinity;
  }
  get empty() {
    return this.x1 < this.x0;
  }
}

export class FxWorld {
  readonly particles: Particle[] = [];
  readonly rings: Ring[] = [];
  readonly flashes: Flash[] = [];
  readonly arcs: Arc[] = [];
  /** Called when something new starts, so a sleeping frame loop wakes up. */
  onWake: () => void = () => {};

  get alive(): boolean {
    return this.particles.length + this.rings.length + this.flashes.length + this.arcs.length > 0;
  }

  burst(o: BurstOptions) {
    const [a0, a1] = o.angle ?? [0, Math.PI * 2];
    for (let i = 0; i < o.count && this.particles.length < MAX_PARTICLES; i++) {
      const a = rand(a0, a1);
      const v = rand(o.speed[0], o.speed[1]);
      const r = o.spread ? Math.sqrt(Math.random()) * o.spread : 0;
      const ra = Math.random() * Math.PI * 2;
      this.particles.push({
        kind: o.kind,
        x: o.x + Math.cos(ra) * r,
        y: o.y + Math.sin(ra) * r,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        age: -(o.delay ?? 0) - Math.random() * 0.04,
        life: rand(o.life[0], o.life[1]),
        size: rand(o.size[0], o.size[1]),
        grow: o.grow ?? 0,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() * 2 - 1) * (o.spin ?? 0),
        drag: o.drag ?? 0,
        gravity: o.gravity ?? 0,
        color: o.colors[i % o.colors.length],
        alpha: o.alpha ?? 1,
      });
    }
    this.onWake();
  }

  ring(o: RingOptions) {
    this.rings.push({ ...o, width: o.width ?? 2, broken: o.broken ?? false, age: -(o.delay ?? 0) });
    this.onWake();
  }

  flash(x: number, y: number, radius: number, life: number, color: string, delay = 0) {
    this.flashes.push({ x, y, radius, life, color, age: -delay });
    this.onWake();
  }

  arc(x1: number, y1: number, x2: number, y2: number, life: number, color: string, jag = 0.28) {
    this.arcs.push({ x1, y1, x2, y2, life, color, jag, age: 0 });
    this.onWake();
  }

  clear() {
    this.particles.length = 0;
    this.rings.length = 0;
    this.flashes.length = 0;
    this.arcs.length = 0;
  }

  step(dt: number) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.age += dt;
      if (p.age < 0) continue;
      if (p.age >= p.life) {
        ps[i] = ps[ps.length - 1];
        ps.pop();
        continue;
      }
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy = p.vy * damp + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      p.size = Math.max(0, p.size + p.grow * dt);
    }
    for (const list of [this.rings, this.flashes, this.arcs] as { age: number; life: number }[][]) {
      for (let i = list.length - 1; i >= 0; i--) {
        list[i].age += dt;
        if (list[i].age >= list[i].life) list.splice(i, 1);
      }
    }
  }
}
