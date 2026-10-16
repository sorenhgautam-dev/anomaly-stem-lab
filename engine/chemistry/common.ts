import type { Build, ExperimentDef, TimelineFrame } from "../types";

/*
 * Shared helpers for the chemistry stage models: reading settings from a
 * Build, the 10-second display timeline, and a few smooth curves.
 */

/** Every chemistry run is shown over this many display seconds. */
export const RUN_SECONDS = 10;
/** Frames per timeline: one every 1/6 s, both ends included. */
export const FRAME_COUNT = 61;

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/**
 * A number setting: the build's value if it is a finite number, else the
 * control's starting value, else `fallback`. Then clamped to [min, max], the
 * range the model is valid for (usually wider than the slider).
 */
export function numberSetting(
  def: ExperimentDef,
  build: Build,
  id: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = build.settings[id];
  if (typeof value === "number" && Number.isFinite(value)) return clamp(value, min, max);
  const control = def.controls?.find((c) => c.id === id);
  return clamp(control?.type === "slider" ? control.initial : fallback, min, max);
}

/** A yes/no setting: the build's value if it is a boolean, else the control's starting value, else `fallback`. */
export function booleanSetting(def: ExperimentDef, build: Build, id: string, fallback: boolean): boolean {
  const value = build.settings[id];
  if (typeof value === "boolean") return value;
  const control = def.controls?.find((c) => c.id === id);
  return control?.type === "toggle" ? control.initial : fallback;
}

/**
 * A choice setting (one of `allowed`): the build's value if it is one of
 * them, else the control's starting value, else `fallback`.
 */
export function choiceSetting(
  def: ExperimentDef,
  build: Build,
  id: string,
  allowed: readonly string[],
  fallback: string,
): string {
  const value = build.settings[id];
  if (typeof value === "string" && allowed.includes(value)) return value;
  const control = def.controls?.find((c) => c.id === id);
  if (control?.type === "choice" && allowed.includes(control.initial)) return control.initial;
  return fallback;
}

/** Straight-line interpolation through (x, y) points sorted by x; flat beyond the ends. */
export function interpolate(points: readonly (readonly [number, number])[], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (x <= x1) {
      const [x0, y0] = points[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return points[points.length - 1][1];
}

/** The run's frames at t = 0, 1/6, 2/6, …, 10 display seconds. */
export function makeTimeline(valuesAt: (t: number) => Record<string, number>): TimelineFrame[] {
  const frames: TimelineFrame[] = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const t = (i * RUN_SECONDS) / (FRAME_COUNT - 1);
    frames.push({ t, values: valuesAt(t) });
  }
  return frames;
}

/** Smooth S-curve: 0 until `from`, 1 from `to` on, flat at both ends. */
export function smoothstep(from: number, to: number, t: number): number {
  const x = clamp((t - from) / (to - from), 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * Newton-style warming towards a new temperature: fast at first, then easing
 * in. Exactly 0 at t = 0 and exactly 1 at the end of the run.
 */
export function settle(t: number, tau: number): number {
  return clamp((1 - Math.exp(-t / tau)) / (1 - Math.exp(-RUN_SECONDS / tau)), 0, 1);
}

/**
 * How much of a quick burst (a reaction that starts at `start` and peaks tau
 * seconds later, see `burstRate`) is done at time t. Exactly 0 until `start`
 * and exactly 1 at the end of the run, so a timeline's last frame equals the
 * final readings.
 */
export function burstDone(t: number, tau: number, start = 0): number {
  const done = (s: number) => (s <= 0 ? 0 : 1 - (1 + s / tau) * Math.exp(-s / tau));
  return clamp(done(t - start) / done(RUN_SECONDS - start), 0, 1);
}

/** The burst's rate: 0 until `start`, rising to exactly 1 at start + tau, then dying away. */
export function burstRate(t: number, tau: number, start = 0): number {
  const s = t - start;
  return s <= 0 ? 0 : (s / tau) * Math.exp(1 - s / tau);
}
