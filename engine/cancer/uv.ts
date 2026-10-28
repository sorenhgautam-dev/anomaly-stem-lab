import type { Simulate } from "../types";
import { booleanSetting, clamp, makeTimeline, numberSetting, RUN_SECONDS, smoothstep } from "../chemistry/common";

/*
 * Stage "uv": how much of the sun's UV gets through cloud (experiment "UV on
 * a cloudy day", CLAUDE.md §3.4). A teaching model: UV reaching the ground is
 * the clear-sky UV times how much the cloud lets through, and the damage
 * points on the skin-cell panel add up with UV × time. Every number is a
 * model value (a share of a clear day), never a real UV index.
 *
 * Cloud blocks much of the light you can see but lets most UV through (WHO:
 * UV "can be high even with cloud cover"; Cancer Research UK: "over 90% of UV
 * rays can still pass through cloud"). Protection (shade, clothes, hat, sunscreen) cuts the UV that
 * reaches the cells.
 *
 * Settings: `cloud` (cover, 0..100 %), `minutes` (time outside),
 *   `protection` (on or off), `protectAt` (0..1 of the run when protection
 *   goes on, for What if?; 0 = from the start).
 * Readings:
 *   uv.share     UV reaching the ground under the full cloud, share of a
 *                clear day (0..1)
 *   damage.end   damage points at the end (model value)
 *   damage.clear damage points on a clear day with no protection, the same time
 * Timeline values: cloud (cover, 0..1, rolling in over the first third),
 *   uv (share of clear-sky UV reaching the cells), damage (points so far),
 *   minute (time outside).
 *
 * Wrong models:
 *   clouds-block-uv   cloud stops nearly all UV
 *   clouds-halve-uv   cloud stops about half of it
 */

type Belief = "real" | "clouds-block-uv" | "clouds-halve-uv";

/** Share of clear-sky UV a cloud cover c (0..1) lets through. */
function transmission(belief: Belief, c: number): number {
  if (belief === "clouds-block-uv") return 1 - 0.97 * c ** 0.15;
  if (belief === "clouds-halve-uv") return 1 - 0.85 * c;
  // Cancer Research UK: "Clouds block some UV, but over 90% of UV rays can still pass through cloud."
  // Ordinary cloud (up to about two thirds cover) lets over 90% through; full grey cover still lets most through.
  return 1 - 0.2 * c ** 2;
}

/** How much protection cuts the UV reaching the cells (model value). */
const PROTECTED = 0.25;
/** Damage points per minute of clear-sky UV (model value). */
const PER_MINUTE = 1;

function uvModel(belief: Belief): Simulate {
  return (def, build) => {
    const cloud = numberSetting(def, build, "cloud", 60, 0, 100) / 100;
    const minutes = numberSetting(def, build, "minutes", 60, 5, 240);
    const protection = booleanSetting(def, build, "protection", false);
    const protectAt = clamp(numberSetting(def, build, "protectAt", 0, 0, 100) / 100, 0, 1);

    const cloudAt = (t: number) => cloud * smoothstep(0, RUN_SECONDS / 3, t);
    const shieldAt = (t: number) => (protection && t >= protectAt * RUN_SECONDS ? PROTECTED : 1);
    const STEPS = 600;
    const dt = RUN_SECONDS / STEPS;
    const damage: number[] = [0];
    for (let i = 0; i < STEPS; i++) {
      const t = i * dt;
      const perSecond = (minutes / RUN_SECONDS) * PER_MINUTE;
      damage.push(damage[i] + transmission(belief, cloudAt(t)) * shieldAt(t) * perSecond * dt);
    }
    const damageAt = (t: number) => damage[Math.min(STEPS, Math.max(0, Math.round(t / dt)))];
    const timeline = makeTimeline((t) => ({
      cloud: cloudAt(t),
      uv: transmission(belief, cloudAt(t)) * shieldAt(t),
      damage: damageAt(t),
      minute: (t * minutes) / RUN_SECONDS,
    }));
    return {
      readings: {
        "uv.share": transmission(belief, cloud),
        "damage.end": damageAt(RUN_SECONDS),
        "damage.clear": minutes * PER_MINUTE,
      },
      faults: [],
      timeline,
    };
  };
}

export const simulateUv: Simulate = uvModel("real");

export const uvWrongModels: Record<string, Simulate> = {
  "clouds-block-uv": uvModel("clouds-block-uv"),
  "clouds-halve-uv": uvModel("clouds-halve-uv"),
};
