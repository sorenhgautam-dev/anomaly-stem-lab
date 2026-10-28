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

export const LOOK: Record<LabId, LabLook> = {
  chemistry: {
    wall: LAB.chemistry.wall,
    floor: LAB.chemistry.floor,
    bench: LAB.chemistry.bench,
    band: LAB.chemistry.bench,
    cabinet: LAB.chemistry.sage,
    kick: LAB.chemistry.floor,
    accent: LAB.chemistry.gold,
    shadow: LAB.chemistry.floor,
  },
  robotics: {
    wall: LAB.robotics.wall,
    floor: LAB.robotics.deep,
    bench: LAB.robotics.bench,
    band: LAB.robotics.trim,
    cabinet: LAB.robotics.trim,
    kick: LAB.robotics.deep,
    accent: LAB.robotics.gold,
    shadow: LAB.robotics.deep,
  },
};
