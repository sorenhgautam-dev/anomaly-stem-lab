import type { ExperimentDef } from "@/engine/types";

/*
 * Camera shots for the experiment's one continuous 3D space (DESIGN.md §8.1):
 * the camera glides in on arrival, settles on the bench to build, moves
 * closer to predict, takes the best angle for the run, and pulls back to show
 * ghost and reality side by side. "particles" dives inside the apparatus.
 */

export type Vec3 = [number, number, number];

export interface Shot {
  position: Vec3;
  target: Vec3;
}

export type ShotName = "arrive" | "build" | "predict" | "run" | "reveal" | "particles";

export type StageShots = Record<Exclude<ShotName, "particles">, Shot> & { particles?: Shot };

/** A camera position orbiting a target: distance, elevation and azimuth in degrees. */
export function orbit(target: Vec3, distance: number, elevation: number, azimuth = 0): Shot {
  const e = (elevation * Math.PI) / 180;
  const a = (azimuth * Math.PI) / 180;
  return { target, position: [target[0] + Math.sin(a) * Math.cos(e) * distance, target[1] + Math.sin(e) * distance, target[2] + Math.cos(a) * Math.cos(e) * distance] };
}

/**
 * A standard set of shots around apparatus `size` wide centred at (cx, cz) on
 * the bench. The HUD covers the top corners and the bottom band, so the aim
 * point sits a little in front of the apparatus, which frames it high and in
 * the clear middle of the screen.
 */
export function benchShots(cx: number, cz: number, size: number, focus?: Vec3, revealAzimuth = 6): StageShots {
  // Close enough that the apparatus, not the bench, fills the space the HUD leaves.
  const dist = 0.72 + size * 1.5;
  const aim: Vec3 = [cx, -0.1, cz + size * 0.14];
  return {
    arrive: orbit(aim, dist * 1.7, 48, 32),
    build: orbit(aim, dist, 38),
    predict: orbit([aim[0], aim[1], aim[2] - size * 0.04], dist * 0.95, 35, 4),
    // The run's best angle: closer, from the left, onto the part that shows the result.
    run: focus ? orbit([focus[0], focus[1] - 0.1, focus[2] + 0.12], 0.6 + size * 0.85, 30, -20) : orbit(aim, dist * 0.72, 30, -14),
    // The reveal leans a little toward the part that shows the result (the rest of the apparatus, like the battery a hint names, stays in frame); `revealAzimuth` turns it to see that part side-on.
    // Aimed a little behind the middle, so the back of the apparatus drops clear of the mission card.
    reveal: focus ? orbit([aim[0] + (focus[0] - aim[0]) * 0.2, aim[1], aim[2] + (focus[2] - aim[2]) * 0.2 - size * 0.12], dist * 1.1, 38, revealAzimuth) : orbit(aim, dist * 1.08, 42),
  };
}

export type ShotsFor = (def: ExperimentDef) => StageShots;

/**
 * How much farther the camera sits on smaller views. On wide screens the HUD
 * cards keep their size while the 3D view shrinks, so the apparatus pulls
 * back to stay in the clear middle; on phones and tablets (HUD below the
 * view) only a tall, narrow view needs it.
 */
export function fitFactor(width: number, height: number): number {
  if (width >= 1024) return Math.min(1.5, Math.max(1, (1440 / width) ** 0.85 * Math.max(1, 900 / height) ** 0.3));
  return Math.min(1.4, Math.max(1, (1.6 / (width / Math.max(1, height))) ** 0.35));
}

/** The shots pulled back by fitFactor (the particle dive stays as it is). */
export function fitShots(shots: StageShots, width: number, height: number): StageShots {
  const k = fitFactor(width, height);
  if (k === 1) return shots;
  const far = (s: Shot): Shot => ({ target: s.target, position: [0, 1, 2].map((i) => s.target[i] + (s.position[i] - s.target[i]) * k) as Vec3 });
  return { arrive: far(shots.arrive), build: far(shots.build), predict: far(shots.predict), run: far(shots.run), reveal: far(shots.reveal), particles: shots.particles };
}
