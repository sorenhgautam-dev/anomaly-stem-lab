import { Color } from "three";
import { LAB, PALETTE as P } from "@/lib/tokens";

/*
 * Shades of Chemistry's palette (DESIGN.md §8) for the heat and gas kit:
 * heat reads in sand gold, cold and water in sage, the student's idea in the
 * wall's teal. Mixed from the lab's own colours (and white or ink), never new
 * hues.
 */

const mix = (a: string, b: string, k: number) => `#${new Color(a).lerp(new Color(b), k).getHexString()}`;

export const TONE = {
  /** Clear ice: white with a breath of sage. */
  ice: mix(P.white, LAB.chemistry.sage, 0.28),
  /** Meltwater: a little more sage than ice. */
  water: mix(P.white, LAB.chemistry.sage, 0.4),
  /** Water molecules: sage deepened so they read on the white beaker. */
  coldParticle: mix(LAB.chemistry.sage, P.ink[900], 0.38),
  /** Air molecules: sand gold, a touch deeper so they read through glass. */
  warmParticle: mix(LAB.chemistry.gold, P.ink[900], 0.12),
  /** A thermometer's spirit column: sand gold deepened to read on its white scale. */
  spirit: mix(LAB.chemistry.gold, P.ink[900], 0.32),
  /** Steam and fizz: white, a pale sage and sage. */
  steam: [P.white, mix(LAB.chemistry.sage, P.white, 0.55), LAB.chemistry.sage] as string[],
  paleSage: mix(LAB.chemistry.sage, P.white, 0.55),
  /** The student's idea: the wall's teal, and a pale wash of it. */
  ghost: LAB.chemistry.wall,
  ghostPale: mix(LAB.chemistry.wall, P.white, 0.7),
} as const;
