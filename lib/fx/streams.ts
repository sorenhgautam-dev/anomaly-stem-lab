import { PALETTE as P } from "@/lib/tokens";
import { centreOf, fxState, lowQuality, type Point2 } from "./binding";

/*
 * Continuous effects for the stages (CLAUDE.md §3.6.4: fizzing liquids,
 * steam, sparks), driven by the simulator's own values every frame.
 */

export type StreamKind = "fizz" | "steam" | "embers";

/** One particle of each continuous effect, launched from a point. */
const STREAMS: Record<StreamKind, (at: Point2) => void> = {
  // Tiny droplets jumping off a fizzing surface.
  fizz: (at) =>
    fxState.world?.burst({ x: at.x, y: at.y, count: 1, kind: "glow", colors: [P.white, P.volt[300]], speed: [30, 95], angle: [-Math.PI / 2 - 0.7, -Math.PI / 2 + 0.7], life: [0.35, 0.75], size: [1.3, 2.6], gravity: 140, drag: 1.5, spread: 16 }),
  // Soft wisps rising off something hot.
  steam: (at) =>
    fxState.world?.burst({ x: at.x, y: at.y, count: 1, kind: "smoke", colors: ["#fff"], speed: [14, 34], angle: [-Math.PI / 2 - 0.3, -Math.PI / 2 + 0.3], life: [1.6, 2.6], size: [9, 15], grow: 14, gravity: -8, drag: 0.5, spread: 22, alpha: 0.45 }),
  // White-hot sparks from something burning.
  embers: (at) =>
    fxState.world?.burst({ x: at.x, y: at.y, count: 1, kind: "spark", colors: [P.apricot[400], P.flame[300]], speed: [60, 170], angle: [-Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9], life: [0.35, 0.9], size: [0.9, 1.6], gravity: 160, drag: 1.2, spread: 24 }),
};

const RATE: Record<StreamKind, number> = { fizz: 42, steam: 7, embers: 34 };

/**
 * A continuous effect for a stage, fed from the playback clock: call it every
 * frame with an element (where it comes from) and an intensity 0..1. It
 * measures the element at most every 400 ms (layout doesn't move during a
 * run) and spawns particles at a rate that follows the intensity.
 */
export function stream(kind: StreamKind) {
  let carry = 0;
  let last = 0;
  let measured: { el: Element; at: Point2; time: number } | null = null;
  return (el: Element | null | undefined, intensity: number) => {
    const now = performance.now();
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!fxState.world || fxState.reduced || !el || intensity <= 0.01) return;
    if (!measured || measured.el !== el || now - measured.time > 400) {
      const at = centreOf(el);
      if (!at) return;
      measured = { el, at, time: now };
    }
    carry += RATE[kind] * Math.min(1, intensity) * dt * (lowQuality() ? 0.5 : 1);
    while (carry >= 1) {
      carry -= 1;
      STREAMS[kind](measured.at);
    }
  };
}
