/*
 * The lab's VFX queue (DESIGN.md §8, §8.1): anything (stages, the run hook,
 * verdict moments) calls vfx.burst() or vfx.ring() with world positions; the
 * <Vfx /> pool in the scene spawns pooled, instanced particles from it.
 * Normal alpha blending with saturated colours, so it reads on cream.
 */

export type VfxKind = "spark" | "smoke" | "bubble" | "confetti" | "glow";

export type Vec3 = [number, number, number];

export interface BurstSpec {
  at: Vec3;
  kind: VfxKind;
  count: number;
  colors: string[];
  /** Initial speed range (units/s). */
  speed: [number, number];
  life: [number, number];
  size: [number, number];
  /** Bias direction (normalised inside); with `cone` 0..1 how tightly to follow it. */
  dir?: Vec3;
  cone?: number;
  gravity?: number;
  drag?: number;
  /** Random start offset radius. */
  spread?: number;
  /** Size growth per second (smoke). */
  grow?: number;
  delay?: number;
}

export interface RingSpec {
  at: Vec3;
  color: string;
  from: number;
  to: number;
  life: number;
  delay?: number;
}

export const vfxQueue: { bursts: BurstSpec[]; rings: RingSpec[]; scale: number } = { bursts: [], rings: [], scale: 1 };

export const vfx = {
  burst(spec: BurstSpec) {
    vfxQueue.bursts.push({ ...spec, count: Math.max(1, Math.round(spec.count * vfxQueue.scale)) });
  },
  ring(spec: RingSpec) {
    vfxQueue.rings.push(spec);
  },
};
