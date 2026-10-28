import { z } from "zod";
import replaysJson from "@/content/replays.json";
import type { Outcome, TimelineFrame } from "@/engine/types";
import { formatReadout, readoutSchema, type Readout } from "@/lib/readout";

/*
 * "The exact moment you were wrong": after a wrong guess, the replay stops
 * where the student's idea (the ghost, the wrong model's run) and reality
 * first part ways by more than a small tolerance. Runs with a timeline are
 * compared frame by frame on the readings in content/replays.json; circuits
 * settle at once, so they part ways the moment the power comes on.
 */

const replaySchema = z.object({
  /** No timeline: compare the final readings when the power comes on. */
  steady: z.boolean().optional(),
  /** Readings to compare, most telling first. The earliest split wins; ties go to the first listed. */
  watch: z.array(readoutSchema).min(1),
});

type ReplayDef = z.infer<typeof replaySchema>;

const REPLAYS: Record<string, ReplayDef> = z.record(z.string(), replaySchema).parse(replaysJson);

/** Share of a reading's whole range that counts as a real difference. */
export const TOLERANCE = 0.03;
/** Playback seconds until a circuit is fully powered (lamps ramp over 0.9 s). */
export const POWER_ON_AT = 0.9;

export interface Divergence {
  /** Playback seconds. */
  t: number;
  real: number;
  ghost: number;
}

export interface ReplayMoment extends Divergence {
  /** The run's own clock at the moment (real seconds), when its timeline has one (melting, reaction speed). */
  clock: number | null;
  readout: Readout;
  steady: boolean;
  /** Both runs of the watched reading over time, for the chart (steady runs have two points). */
  realSeries: { t: number; v: number }[];
  ghostSeries: { t: number; v: number }[];
}

export function replayFor(experimentId: string): ReplayDef | undefined {
  return REPLAYS[experimentId];
}

/** First frame where the two runs differ by more than TOLERANCE of the reading's range. Null if they never do. */
export function firstDivergence(real: TimelineFrame[], ghost: TimelineFrame[], key: string, tolerance = TOLERANCE): Divergence | null {
  const n = Math.min(real.length, ghost.length);
  const values: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = real[i].values[key];
    const b = ghost[i].values[key];
    if (Number.isFinite(a)) values.push(a);
    if (Number.isFinite(b)) values.push(b);
  }
  if (values.length === 0) return null;
  const range = Math.max(...values) - Math.min(...values);
  const limit = Math.max(1e-9, range * tolerance);
  for (let i = 0; i < n; i++) {
    const a = real[i].values[key];
    const b = ghost[i].values[key];
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (Math.abs(a - b) > limit) return { t: real[i].t, real: a, ghost: b };
  }
  return null;
}

const series = (timeline: TimelineFrame[], key: string) => timeline.filter((f) => Number.isFinite(f.values[key])).map((f) => ({ t: f.t, v: f.values[key] }));

/** Where the student's idea and reality first part ways, or null (no ghost, or they never do). */
export function replayMoment(experimentId: string, outcome: Outcome, ghost: Outcome | null): ReplayMoment | null {
  const def = replayFor(experimentId);
  if (!def || !ghost) return null;
  if (def.steady) {
    for (const readout of def.watch) {
      const real = outcome.readings[readout.key];
      const idea = ghost.readings[readout.key];
      if (!Number.isFinite(real) || !Number.isFinite(idea)) continue;
      // Steady runs: a difference that shows on screen is a real one.
      if (formatReadout(real, readout) === formatReadout(idea, readout)) continue;
      const realSeries = [{ t: 0, v: 0 }, { t: POWER_ON_AT, v: real }];
      const ghostSeries = [{ t: 0, v: 0 }, { t: POWER_ON_AT, v: idea }];
      return { t: POWER_ON_AT, clock: null, real, ghost: idea, readout, steady: true, realSeries, ghostSeries };
    }
    return null;
  }
  if (!outcome.timeline || !ghost.timeline) return null;
  let best: ReplayMoment | null = null;
  for (const readout of def.watch) {
    const d = firstDivergence(outcome.timeline, ghost.timeline, readout.key);
    if (!d || (best && d.t >= best.t)) continue;
    const clock = outcome.timeline.find((f) => f.t === d.t)?.values.clock;
    best = { ...d, clock: Number.isFinite(clock) ? clock! : null, readout, steady: false, realSeries: series(outcome.timeline, readout.key), ghostSeries: series(ghost.timeline, readout.key) };
  }
  return best;
}

/** Seconds as the time scrubber and the stage's own chart count them: the run's clock if it has one. */
export function momentSeconds(m: ReplayMoment, timeScale: number): number {
  return m.clock ?? m.t * timeScale;
}

/** Ano's one line at the paused moment, with the simulator's numbers. */
export function replayLine(m: ReplayMoment, timeScale: number): string {
  const real = formatReadout(m.real, m.readout);
  const idea = formatReadout(m.ghost, m.readout);
  const when = m.steady ? "The moment the power came on," : `Right here, at ${momentSeconds(m, timeScale).toFixed(1)} s,`;
  return `${when} ${m.readout.name} was at ${real}. Your idea said ${idea}.`;
}
