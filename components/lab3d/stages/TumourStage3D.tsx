"use client";

import { useEffect } from "react";
import { Vector3 } from "three";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { labView, setAnchor } from "../lab-state";
import { Cluster } from "../kit/bio/Cluster";
import { Readout } from "../kit/chem/instruments";
import { useSnapshot } from "../kit/chem/heat/useSnapshot";
import { Graph3D } from "../kit/Graph3D";
import { Scanner3D } from "../kit/apparatus";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * How tumours grow, in 3D (stage "tumour", engine/cancer/tumour.ts): a calm
 * scanning room. A white scanner ring stands on the bench with a teal sweep
 * line; inside it a small cluster of soft cells grows as the simulator's
 * count doubles, month by month. A live graph beside it draws the count, so
 * the long flat start and the sudden climb are easy to see. After a wrong
 * guess a see-through cluster shows the student's idea at the same moment.
 */

const RING_Y = 0.6;

export function tumourShots(): StageShots {
  const aim: [number, number, number] = [0.2, 0.5, 0];
  return {
    arrive: orbit(aim, 6.4, 30, 24),
    build: orbit(aim, 3.6, 14),
    predict: orbit(aim, 3.4, 12, 6),
    run: orbit(aim, 3.3, 12, -4),
    reveal: orbit([0.2, 0.52, 0], 3.8, 12),
  };
}

export function TumourStage3D() {
  const sv = useStageValues();
  const snap = useSnapshot(sv);

  useEffect(() => {
    setAnchor("focus", new Vector3(-0.35, RING_Y, 0.2));
    setAnchor("ghost", new Vector3(-0.35, 1.25, 0));
    setAnchor("ano", new Vector3(0.35, 0.25, 0.7));
    return () => {
      labView.anchors.delete("ghost");
      labView.anchors.delete("ano");
    };
  }, []);

  return (
    <group>
      <group position={[-0.35, 0, 0]}>
        {/* The scanner, with the cluster floating in its bore. */}
        <Scanner3D>
          <Cluster count={() => snap.now.cells ?? 8} color={LAB.robotics.teal} radius={0.07} />
          {sv.ghost && <Cluster count={() => snap.ghost?.cells ?? 8} color={P.white} radius={0.07} opacity={0.4} />}
        </Scanner3D>
      </group>
      <Readout text={() => `Month ${Math.round(snap.now.month ?? 0)}\n${Math.round(snap.now.cells ?? 8).toLocaleString("en-GB")} cells`} style="screen" height={0.085} position={[0.3, 1.2, 0.05]} />
      <Graph3D value="cells" label="Cells in the cluster" unit="cells" digits={0} width={0.78} position={[0.62, 0.72, -0.1]} />
    </group>
  );
}
