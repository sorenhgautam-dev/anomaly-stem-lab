"use client";

import { ContactShadows } from "@react-three/drei";
import type { LabId } from "@/engine/types";
import { useQuality } from "@/lib/quality";
import { Bench } from "./set/Bench";
import { ChemistrySet } from "./set/ChemistrySet";
import { LOOK } from "./set/look";
import { RoboticsSet } from "./set/RoboticsSet";
import { Room } from "./set/Room";

/*
 * The lab's set (DESIGN.md §8 lab colour worlds): the room in the lab's
 * colour, the bench, the lab's own set pieces (Chemistry's fume hood and
 * reagent shelf, Robotics' pegboard and tool rack), and a contact shadow
 * under the apparatus, baked when the build changes rather than every frame.
 */

export function Studio({ lab, shadowKey }: { lab: LabId; shadowKey: string }) {
  const tier = useQuality((s) => s.level);
  return (
    <group>
      <Room lab={lab} />
      <Bench lab={lab} />
      {lab === "chemistry" ? <ChemistrySet /> : <RoboticsSet />}
      <ContactShadows key={shadowKey} frames={tier === "low" ? 1 : 2} position={[0, 0.002, 0.2]} scale={7} far={1.6} blur={2.4} opacity={0.42} resolution={tier === "low" ? 256 : 512} color={LOOK[lab].shadow} />
    </group>
  );
}
