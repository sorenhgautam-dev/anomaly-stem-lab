import type { LabId } from "@/engine/types";

/*
 * The labs the site shows and the colour world each one is built in
 * (CLAUDE.md §2, DESIGN.md §3.2). The four cancer labs come first, in story
 * order. The earlier chemistry and robotics labs keep their code and routes
 * but are hidden from every list, count and preview (GAUNTLET.md G13).
 *
 * A "world" is the 3D room and palette a lab borrows: Cell is a teal
 * microscope room (the chemistry set), Detection and Treatment are graphite
 * rooms (the robotics set), Prevention is a sunny sand-gold day of its own.
 */

export const VISIBLE_LABS = ["cell", "prevention", "detection", "treatment"] as const satisfies readonly LabId[];
export const HIDDEN_LABS = ["chemistry", "robotics"] as const satisfies readonly LabId[];

export type World = "chemistry" | "robotics";

const WORLD: Record<LabId, World> = {
  cell: "chemistry",
  prevention: "chemistry",
  detection: "robotics",
  treatment: "robotics",
  chemistry: "chemistry",
  robotics: "robotics",
};

/** The 3D room and palette a lab is built in. */
export function worldOf(lab: LabId): World {
  return WORLD[lab];
}

export function isVisibleLab(lab: LabId): boolean {
  return (VISIBLE_LABS as readonly LabId[]).includes(lab);
}
