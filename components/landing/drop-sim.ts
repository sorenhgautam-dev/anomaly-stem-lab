/*
 * The landing's "Which falls faster?" teaser (CLAUDE.md §3.2), as a tiny
 * deterministic model, so the verdict comes from physics, not a hard-coded
 * answer. Two balls of the same size dropped together from the same height:
 * with air resistance negligible, fall time is √(2h/g) whatever the mass.
 * A ghost of the student's belief ("heavier falls faster") falls with a
 * bigger effective g, so it lands first.
 */

export type DropGuess = "heavy" | "light" | "same";

export const DROP = {
  /** Ball centre height at release and at rest on the floor (scene units). */
  startY: 1.18,
  floorY: -0.98,
  radius: 0.3,
  /** Scene gravity, tuned so the fall takes about 0.85 s on screen. */
  g: 6,
  masses: { steel: 4.1, glass: 1.3 },
  /** How bouncy each ball is. */
  restitution: { steel: 0.22, glass: 0.42 },
  /** The ghost of "heavier (or lighter) falls faster". */
  ghostGravityFactor: 2.4,
};

/** Seconds until a ball released at rest from startY first touches the floor. */
export function landingTime(g: number): number {
  return Math.sqrt((2 * (DROP.startY - DROP.floorY)) / g);
}

/** Height of a ball at time t: free fall, then up to three damped bounces. */
export function ballHeight(t: number, g: number, restitution: number): number {
  const h = DROP.startY - DROP.floorY;
  let tFirst = Math.sqrt((2 * h) / g);
  if (t <= tFirst) return DROP.startY - 0.5 * g * t * t;
  let v = g * tFirst * restitution;
  let start = tFirst;
  for (let bounce = 0; bounce < 3; bounce++) {
    const flight = (2 * v) / g;
    if (t <= start + flight) {
      const dt = t - start;
      return DROP.floorY + v * dt - 0.5 * g * dt * dt;
    }
    start += flight;
    v *= restitution;
    tFirst = start;
  }
  return DROP.floorY;
}

/**
 * The real model's answer: compare when the steel and the glass ball land.
 * Mass doesn't appear in free fall, so both use the same g.
 */
export function realAnswer(): DropGuess {
  const steel = landingTime(DROP.g);
  const glass = landingTime(DROP.g);
  if (Math.abs(steel - glass) < 1e-3) return "same";
  return steel < glass ? "heavy" : "light";
}

/** Which ball the ghost is, for a wrong guess (null when the guess was right). */
export function ghostFor(guess: DropGuess): "steel" | "glass" | null {
  if (guess === realAnswer()) return null;
  return guess === "heavy" ? "steel" : guess === "light" ? "glass" : null;
}

/** How long a drop plays before the verdict shows. */
export const DROP_SECONDS = landingTime(DROP.g) + 0.75;
