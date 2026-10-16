import { RAMP } from "@/lib/tokens";
import { count as n, fxState, type Point2 } from "./binding";

/*
 * One-off effects for the lab's moments (CLAUDE.md §3.6.4, §3.7), in screen
 * pixels. Reduced motion keeps only the soft flashes.
 */

/** Correct prediction: a gold shockwave, a burst of light and falling sparks. */
function success(at: Point2, scale = 1) {
  const { world, reduced } = fxState;
  if (!world) return;
  world.flash(at.x, at.y, 240 * scale, 0.8, RAMP.resolve[300]);
  if (reduced) return;
  world.ring({ x: at.x, y: at.y, from: 24, to: 300 * scale, life: 0.95, color: RAMP.resolve[400], width: 3 });
  world.ring({ x: at.x, y: at.y, from: 10, to: 200 * scale, life: 0.85, color: RAMP.resolve[300], width: 1.5, delay: 0.12 });
  world.burst({ x: at.x, y: at.y, count: n(50), kind: "glow", colors: [RAMP.resolve[300], RAMP.resolve[400], RAMP.mist[100]], speed: [180, 560 * scale], life: [0.7, 1.3], size: [3, 7], drag: 2.2, gravity: 160, spread: 18 });
  world.burst({ x: at.x, y: at.y, count: n(26), kind: "spark", colors: [RAMP.resolve[300], RAMP.mist[100]], speed: [320, 760 * scale], life: [0.4, 0.8], size: [1.4, 2.4], drag: 2.4, gravity: 320 });
}

/** Wrong prediction: a coral flash, an unstable broken ring and flying shards. */
function anomaly(at: Point2, scale = 1) {
  const { world, reduced } = fxState;
  if (!world) return;
  world.flash(at.x, at.y, 220 * scale, 0.55, RAMP.anomaly[400]);
  if (reduced) return;
  world.ring({ x: at.x, y: at.y, from: 24, to: 280 * scale, life: 0.85, color: RAMP.anomaly[400], width: 3, broken: true });
  // A blue copy a beat behind: the RGB split of the glitch.
  world.ring({ x: at.x + 4, y: at.y, from: 20, to: 270 * scale, life: 0.7, color: RAMP.ion[400], width: 1.5, broken: true, delay: 0.05 });
  world.burst({ x: at.x, y: at.y, count: n(36), kind: "shard", colors: [RAMP.anomaly[300], RAMP.anomaly[400], RAMP.anomaly[600]], speed: [220, 620 * scale], life: [0.6, 1.1], size: [5, 11], drag: 2.4, gravity: 240, spin: 9, spread: 14 });
}

/** A short circuit at a point: crackling arcs, a shower of sparks, then smoke. */
function shortCircuit(at: Point2) {
  const { world, reduced } = fxState;
  if (!world) return;
  world.flash(at.x, at.y, 140, 0.3, RAMP.mist[100]);
  if (reduced) return;
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 50 + Math.random() * 60;
    world.arc(at.x, at.y, at.x + Math.cos(a) * d, at.y + Math.sin(a) * d, 0.6 + Math.random() * 0.7, i % 2 ? RAMP.glow[200] : RAMP.ion[200]);
  }
  world.burst({ x: at.x, y: at.y, count: n(44), kind: "spark", colors: [RAMP.resolve[300], RAMP.mist[100], RAMP.resolve[400]], speed: [260, 680], angle: [-Math.PI + 0.25, -0.25], life: [0.5, 1.1], size: [1.2, 2.2], gravity: 950, drag: 0.6 });
  smoke(at, 1, 0.25);
}

/** Something burns out (an LED pops): a small flash, sparks and smoke. */
function burnout(at: Point2) {
  const { world, reduced } = fxState;
  if (!world) return;
  world.flash(at.x, at.y, 90, 0.25, RAMP.ion[200]);
  if (reduced) return;
  world.ring({ x: at.x, y: at.y, from: 6, to: 60, life: 0.35, color: RAMP.mist[100], width: 1.5 });
  world.burst({ x: at.x, y: at.y, count: n(18), kind: "spark", colors: [RAMP.resolve[300], RAMP.mist[100]], speed: [180, 420], angle: [-Math.PI + 0.3, -0.3], life: [0.35, 0.8], size: [1, 1.8], gravity: 800, drag: 0.8 });
  smoke(at, 0.8, 0.1);
}

/** Rising smoke puffs, staggered over about two seconds. */
function smoke(at: Point2, amount = 1, delay = 0) {
  const { world, reduced } = fxState;
  if (!world || reduced) return;
  for (let i = 0; i < 4; i++) {
    world.burst({ x: at.x, y: at.y - 6, count: n(Math.ceil(3 * amount)), kind: "smoke", colors: ["#fff"], speed: [18, 46], angle: [-Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5], life: [1.6, 2.6], size: [10, 18], grow: 18, drag: 0.4, gravity: -12, spread: 8, alpha: 0.9, delay: delay + i * 0.38 });
  }
}

/** Level complete: confetti in the brand colours from both top corners. */
function confetti() {
  const { world, reduced } = fxState;
  if (!world || reduced) return;
  const w = window.innerWidth;
  const colors = [RAMP.ion[400], RAMP.glow[400], RAMP.resolve[400], RAMP.ion[200], RAMP.glow[200], RAMP.resolve[300]];
  const common = { kind: "confetti" as const, colors, life: [2.6, 3.8] as [number, number], size: [4, 7] as [number, number], gravity: 620, drag: 1.3, spin: 7 };
  world.burst({ ...common, x: 0, y: window.innerHeight * 0.55, count: n(80), speed: [700, 1250], angle: [-1.25, -0.55] });
  world.burst({ ...common, x: w, y: window.innerHeight * 0.55, count: n(80), speed: [700, 1250], angle: [-Math.PI + 0.55, -Math.PI + 1.25] });
  world.burst({ ...common, x: w / 2, y: -20, count: n(60), speed: [40, 220], angle: [0.2, Math.PI - 0.2], spread: w / 2, delay: 0.35 });
}

/** A very small screen shake on big moments (none with reduced motion). */
function shake(el: HTMLElement | null, strength = 1) {
  const { reduced } = fxState;
  if (!el || reduced) return;
  const s = strength;
  el.animate(
    [
      { transform: "translate3d(0, 0, 0)" },
      { transform: `translate3d(${-5 * s}px, ${2 * s}px, 0)` },
      { transform: `translate3d(${4 * s}px, ${-2 * s}px, 0)` },
      { transform: `translate3d(${-2 * s}px, ${1 * s}px, 0)` },
      { transform: "translate3d(0, 0, 0)" },
    ],
    { duration: 340, easing: "cubic-bezier(0.2, 0, 0, 1)" },
  );
}

/** Run pressed: the bench powers up with a soft ion pulse from the experiment. */
function powerUp(at: Point2) {
  const { world, reduced } = fxState;
  if (!world) return;
  world.flash(at.x, at.y, 160, 0.5, RAMP.ion[400]);
  if (reduced) return;
  world.ring({ x: at.x, y: at.y, from: 10, to: 190, life: 0.6, color: RAMP.ion[300], width: 1.5 });
  world.burst({ x: at.x, y: at.y, count: n(14), kind: "glow", colors: [RAMP.ion[200], RAMP.glow[200]], speed: [60, 200], life: [0.4, 0.8], size: [2, 3.5], drag: 3, spread: 30 });
}

export const fx = { success, anomaly, shortCircuit, burnout, smoke, confetti, shake, powerUp };
