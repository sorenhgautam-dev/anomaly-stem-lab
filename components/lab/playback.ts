import type { TimelineFrame } from "@/engine/types";

/*
 * One playback clock for a run (CLAUDE.md §3.5 time scrubber: pause, slow
 * motion, rewind). A single requestAnimationFrame loop; stage renderers
 * subscribe and write to the DOM directly, so playback never re-renders
 * React (CLAUDE.md §9).
 */

export type FrameListener = (t: number, values: Record<string, number>) => void;
type StateListener = () => void;

/** Linear interpolation of a timeline at time t. */
export function sample(timeline: TimelineFrame[] | undefined, t: number): Record<string, number> {
  if (!timeline || timeline.length === 0) return {};
  if (t <= timeline[0].t) return timeline[0].values;
  const last = timeline[timeline.length - 1];
  if (t >= last.t) return last.values;
  let lo = 0;
  let hi = timeline.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (timeline[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = timeline[lo];
  const b = timeline[hi];
  const k = (t - a.t) / (b.t - a.t || 1);
  const out: Record<string, number> = {};
  for (const key of Object.keys(a.values)) {
    const va = a.values[key];
    const vb = b.values[key] ?? va;
    out[key] = va + (vb - va) * k;
  }
  return out;
}

export class Playback {
  t = 0;
  duration = 1;
  speed = 1;
  playing = false;
  ended = false;
  private timeline: TimelineFrame[] | undefined;
  private frames = new Set<FrameListener>();
  private states = new Set<StateListener>();
  private raf = 0;
  private last = 0;
  private onEnd: (() => void) | null = null;

  /** Start a fresh run from t = 0. onEnd fires once when it first finishes. */
  load(timeline: TimelineFrame[] | undefined, duration: number, onEnd: () => void) {
    this.timeline = timeline;
    this.duration = Math.max(0.1, duration);
    this.onEnd = onEnd;
    this.ended = false;
    this.t = 0;
    this.play();
  }

  play() {
    if (this.t >= this.duration) this.t = 0;
    this.playing = true;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.tick);
    this.emitState();
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.emitState();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(t: number) {
    this.t = Math.min(this.duration, Math.max(0, t));
    this.emitFrame();
  }

  setSpeed(speed: number) {
    this.speed = speed;
    this.emitState();
  }

  /** Rewind to the start and play again. */
  restart() {
    this.t = 0;
    this.play();
  }

  /** Jump to the end (finishes the run). */
  skip() {
    this.t = this.duration;
    this.finish();
  }

  stop() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
  }

  values(): Record<string, number> {
    return sample(this.timeline, this.t);
  }

  onFrame(fn: FrameListener): () => void {
    this.frames.add(fn);
    fn(this.t, this.values());
    return () => {
      this.frames.delete(fn);
    };
  }

  onState(fn: StateListener): () => void {
    this.states.add(fn);
    return () => {
      this.states.delete(fn);
    };
  }

  private tick = (now: number) => {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.t = Math.min(this.duration, this.t + dt * this.speed);
    this.emitFrame();
    if (this.t >= this.duration) {
      this.finish();
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private finish() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.emitFrame();
    if (!this.ended) {
      this.ended = true;
      this.onEnd?.();
    }
    this.emitState();
  }

  private emitFrame() {
    const values = this.values();
    for (const fn of this.frames) fn(this.t, values);
  }

  private emitState() {
    for (const fn of this.states) fn();
  }
}

/** The one playback clock for the current experiment page. */
export const playback = new Playback();
