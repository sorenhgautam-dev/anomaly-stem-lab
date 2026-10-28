import type { LabId } from "@/engine/types";
import { LAB } from "@/lib/tokens";

/*
 * Each lab's colour world (DESIGN.md §8), in one place for the room, the
 * bench, the set pieces and the ambient life. Every value is from the lab's
 * own palette (or a shade of it); nothing here is shared between the labs.
 */

export interface LabLook {
  /** The backdrop, top to bottom, and the floor it settles into. */
  wall: string;
  floor: string;
  /** Worktop, the band under it, the cabinet and its doors, the kick at the floor. */
  bench: string;
  band: string;
  cabinet: string;
  kick: string;
  /** Door handles, the lit strip on the bench's front edge, and "active" highlights. */
  accent: string;
  /** Contact shadows on the bench. */
  shadow: string;
}

const CHEMISTRY: LabLook = {
  wall: LAB.chemistry.wall,
  floor: LAB.chemistry.floor,
  bench: LAB.chemistry.bench,
  band: LAB.chemistry.bench,
  cabinet: LAB.chemistry.sage,
  kick: LAB.chemistry.floor,
  accent: LAB.chemistry.gold,
  shadow: LAB.chemistry.floor,
};

const ROBOTICS: LabLook = {
  wall: LAB.robotics.wall,
  floor: LAB.robotics.deep,
  bench: LAB.robotics.bench,
  band: LAB.robotics.trim,
  cabinet: LAB.robotics.trim,
  kick: LAB.robotics.deep,
  accent: LAB.robotics.gold,
  shadow: LAB.robotics.deep,
};

/*
 * The cancer labs (DESIGN.md §3.2): Cell is the teal microscope room;
 * Prevention a sunny sand-gold day; Detection a graphite scanning room lit in
 * teal; Treatment a graphite treatment room with gold.
 */
export const LOOK: Record<LabId, LabLook> = {
  cell: CHEMISTRY,
  prevention: { wall: LAB.prevention.wall, floor: LAB.prevention.floor, bench: LAB.prevention.bench, band: LAB.prevention.bench, cabinet: LAB.prevention.sage, kick: LAB.prevention.floor, accent: LAB.prevention.teal, shadow: LAB.prevention.floor },
  detection: { ...ROBOTICS, accent: LAB.robotics.teal },
  treatment: ROBOTICS,
  chemistry: CHEMISTRY,
  robotics: ROBOTICS,
};
