/*
 * World layout for the landing scene. Plain numbers only: this file is also
 * imported by DOM code, so it must not pull in three.js or Rapier.
 * The hero experiment sits at the origin;
 * the ANOMALY title floats further down -z. The camera rail runs through five
 * keys: the hero, then one per chapter (Predict → Diagnose → Break → Rebuild),
 * evenly spaced in scroll progress (0, 0.25, 0.5, 0.75, 1).
 */

export type Vec3 = [number, number, number];

// Look targets are offset from the title so it lands beside the chapter
// copy (left) rather than under it.
export const CAMERA_KEYS: { pos: Vec3; look: Vec3 }[] = [
  { pos: [0, 0.35, 7.2], look: [0, 0.1, 0] }, // hero
  { pos: [-0.3, 3.4, 3.4], look: [-2.4, 0.55, -8.5] }, // predict: high over the balls, title snaps in
  { pos: [6.4, 1.3, -1.4], look: [-1.3, 0.45, -7.9] }, // diagnose: side angle
  { pos: [0.3, 3.2, -0.6], look: [-1.5, 0.2, -8.5] }, // break: pulled up, title scatters
  { pos: [0, 0.2, -1.2], look: [0, -0.5, -8.5] }, // rebuild: low and square on, title above the copy
];

/** Scroll progress of each chapter, in order. */
export const CHAPTER_STOPS = [0.25, 0.5, 0.75, 1] as const;

export const TITLE_CENTER: Vec3 = [0, 0.55, -8.5];
export const TITLE_SCALE = 0.6;

export const FLOOR_Y = -1.4;

export const BALL_RADIUS = 0.4;
export const BALL_X = 0.85;
export const BALL_START_Y = 1.25;
