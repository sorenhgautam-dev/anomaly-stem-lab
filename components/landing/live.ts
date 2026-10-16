import type Lenis from "lenis";

/** A plain vector, so DOM code can import this file without pulling in three.js. */
export interface Vec {
  x: number;
  y: number;
  z: number;
}

/**
 * Per-frame values shared between the DOM and the WebGL scene. A plain
 * mutable object, not React state, so reading it inside useFrame never
 * re-renders anything (CLAUDE.md §9: no React state updates per frame).
 */
export const live = {
  /** Raw scroll progress 0..1 from Lenis. Subscribe with onProgress(). */
  progress: 0,
  /** World position of the invisible cursor body that knocks objects. */
  cursor: { x: 0, y: 0, z: 1000 } as Vec,
  /** False until the pointer has moved, so objects aren't hit at load. */
  pointerActive: false,
  /** Ano's world position and whether Ano is out, so objects make room. */
  ano: { x: 0, y: -50, z: 0 } as Vec,
  anoVisible: false,
  /** 0..1 spike for the ANOMALY moment (chromatic aberration, glitch). Decays. */
  pulse: 0,
  reducedMotion: false,
  /** Smooth scroller. Driven from the R3F frame loop (one animation loop). */
  lenis: null as Lenis | null,
  /** Scroll to a progress value 0..1 (set by the Lenis owner). */
  scrollTo: (progress: number) => {
    void progress;
  },
};

type ProgressListener = (progress: number) => void;
const listeners = new Set<ProgressListener>();

/** Call fn now and on every scroll update. Returns an unsubscribe function. */
export function onProgress(fn: ProgressListener): () => void {
  listeners.add(fn);
  fn(live.progress);
  return () => {
    listeners.delete(fn);
  };
}

export function publishProgress(progress: number): void {
  live.progress = progress;
  for (const fn of listeners) fn(progress);
}

/** Copy x, y, z from one vector-like object into another. */
export function setVec(target: Vec, source: Vec): void {
  target.x = source.x;
  target.y = source.y;
  target.z = source.z;
}
