import { MeshBasicMaterial, MeshStandardMaterial } from "three";
import { LAB } from "@/lib/tokens";

/*
 * Shared looks for the robot kit (DESIGN.md §8, §8.1): the ghost of the
 * student's belief is a translucent teal copy (told apart by shape and
 * opacity too, never colour alone), and trails and current glow like neon
 * tape. One material per look, shared by every part.
 */

let ghost: MeshBasicMaterial | null = null;
/** The ghost (the student's belief): translucent teal, no depth write. */
export function ghostMaterial(): MeshBasicMaterial {
  ghost ??= new MeshBasicMaterial({ color: LAB.robotics.teal, transparent: true, opacity: 0.34, depthWrite: false });
  return ghost;
}

let ghostSolid: MeshBasicMaterial | null = null;
/** Ghost marks that must read on their own (dashes, needles): stronger teal. */
export function ghostMarkMaterial(): MeshBasicMaterial {
  ghostSolid ??= new MeshBasicMaterial({ color: LAB.robotics.teal, transparent: true, opacity: 0.72, depthWrite: false });
  return ghostSolid;
}

const neon = new Map<string, MeshStandardMaterial>();
/** A glowing tape colour (trails, current dots): emissive, so it reads on white and graphite alike. */
export function neonMaterial(color: string): MeshStandardMaterial {
  let m = neon.get(color);
  if (!m) {
    m = new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.35 });
    neon.set(color, m);
  }
  return m;
}

export const smooth = (k: number) => {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
};
