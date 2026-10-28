"use client";

import { ContactShadows } from "@react-three/drei";
import type { LabId } from "@/engine/types";
import { LAB } from "@/lib/tokens";
import { Cluster } from "@/components/lab3d/kit/bio/Cluster";
import { Colony, Dish3D } from "@/components/lab3d/kit/bio/Dish3D";
import { Microscope3D, Scanner3D, TreatmentMachine3D, UvMeter3D } from "@/components/lab3d/kit/apparatus";
import { Cove } from "@/components/lab3d/kit/Cove";
import { Bench } from "@/components/lab3d/scene/set/Bench";
import { LOOK } from "@/components/lab3d/scene/set/look";
import { FitModel } from "./FitModel";
import { FluffyCloud, Sun } from "@/components/lab3d/kit/sky";

/*
 * Each cancer lab's preview bench (DESIGN.md §7.1 "the four labs", §8 lab
 * sets): real apparatus from the lab kit in the lab's own colours. Cell: two
 * dishes of cells and a flask. Prevention: the sun, a cloud and a UV meter on
 * a stand. Detection: a scanner ring round a small cluster of cells.
 * Treatment: the chemo dishes with their three kinds of cells. Calm and
 * clean: soft cells, no red, nothing graphic.
 */

/** The lab's own bench, scaled to the card, in front of a curved backdrop in the lab's colour, with soft baked shadows. */
function Set({ lab }: { lab: LabId }) {
  const look = LOOK[lab];
  return (
    <>
      <Cove color={look.wall} width={6} depth={2.4} height={3.2} bend={0.8} y={-0.52} />
      <group scale={0.42}>
        <Bench lab={lab} />
      </group>
      <ContactShadows frames={1} position={[0, 0.002, 0.08]} scale={[2.8, 1.4]} far={0.8} blur={2.2} opacity={0.4} color={look.shadow} resolution={256} />
      {/* A strong rim from behind so apparatus separates from the backdrop (DESIGN.md §8 lighting). */}
      <directionalLight position={[-2, 2.6, -2.4]} intensity={1.6} />
    </>
  );
}

function CellBench() {
  return (
    <>
      <group position={[-0.45, 0, -0.05]}>
        <FitModel width={1.1} height={1.35}>
          <Microscope3D>
            <Colony count={() => 26} room={30} radius={0.05} size={0.012} color={LAB.chemistry.sage} y={0.004} />
          </Microscope3D>
        </FitModel>
      </group>
      <group position={[0.45, 0, 0.15]}>
        <FitModel width={0.95} height={0.36}>
          <Dish3D radius={0.34}>
            <Colony count={() => 150} room={90} radius={0.29} color={LAB.chemistry.gold} />
          </Dish3D>
        </FitModel>
      </group>
    </>
  );
}

function PreventionBench() {
  return (
    <>
      <Sun position={[-0.7, 1.05, -0.35]} radius={0.22} />
      <FluffyCloud seed={5} bounds={[0.55, 0.14, 0.2]} position={[-0.3, 0.88, -0.1]} segments={10} />
      <group position={[0.62, 0, 0.1]}>
        <FitModel width={0.5} height={1.0}>
          <UvMeter3D />
        </FitModel>
      </group>
    </>
  );
}

function DetectionBench() {
  return (
    <group position={[0, 0, -0.05]}>
      <FitModel width={1.7} height={1.15}>
        <Scanner3D>
          <Cluster count={() => 120} color={LAB.robotics.teal} radius={0.09} />
        </Scanner3D>
      </FitModel>
    </group>
  );
}

function TreatmentBench() {
  return (
    <>
      <group position={[-0.25, 0, -0.05]}>
        <FitModel width={1.35} height={1.1}>
          <TreatmentMachine3D />
        </FitModel>
      </group>
      <group position={[0.85, 0, 0.2]}>
        <FitModel width={0.6} height={0.22}>
          <Dish3D radius={0.32}>
            <Colony count={() => 52} room={80} radius={0.27} color={LAB.robotics.teal} />
          </Dish3D>
        </FitModel>
      </group>
    </>
  );
}

const BENCHES: Record<LabId, () => React.JSX.Element> = {
  cell: CellBench,
  prevention: PreventionBench,
  detection: DetectionBench,
  treatment: TreatmentBench,
  chemistry: CellBench,
  robotics: TreatmentBench,
};

/** A lab's bench of apparatus, sitting on its plinth. */
export function LabBench({ lab }: { lab: LabId }) {
  const Bench_ = BENCHES[lab];
  return (
    <group position={[0, -0.62, 0]}>
      <Set lab={lab} />
      <Bench_ />
    </group>
  );
}
