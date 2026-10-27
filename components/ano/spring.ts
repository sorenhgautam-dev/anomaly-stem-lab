/*
 * A damped spring, slightly underdamped so moves overshoot a little and
 * settle (DESIGN.md §6: "all springy, never linear").
 */
export class Spring {
  v = 0;
  constructor(
    public x: number,
    private k = 120,
    private c = 14,
  ) {}

  step(target: number, dt: number): number {
    // Two half steps keep stiff springs stable when a frame runs long.
    for (let i = 0; i < 2; i++) {
      const h = dt / 2;
      this.v += (this.k * (target - this.x) - this.c * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 0 → 1 → 0 over `length` seconds, smooth. */
export const pulse = (t: number, length: number) => (t <= 0 || t >= length ? 0 : Math.sin((t / length) * Math.PI));

export const easeInOutBack = (t: number) => {
  const c = 1.70158 * 1.525;
  return t < 0.5 ? ((2 * t) ** 2 * ((c + 1) * 2 * t - c)) / 2 : ((2 * t - 2) ** 2 * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
};
