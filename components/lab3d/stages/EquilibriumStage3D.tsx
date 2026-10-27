"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Vector3, type Group } from "three";
import { useLab } from "@/lib/store";
import { useQuality } from "@/lib/quality";
import { useLabUi } from "../lab-ui";
import { labView, setAnchor } from "../lab-state";
import { Readout, Thermometer3D } from "../kit/chem/instruments";
import { BATH, WaterBath3D } from "../kit/chem/react/bath";
import { SealedTube3D, TUBE } from "../kit/chem/react/gas-tube";
import { GhostLabel } from "../kit/chem/react/GhostLabel";
import { kitMaterial } from "../kit/materials";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Equilibrium (Le Chatelier), in 3D (stage "equilibrium",
 * engine/chemistry/equilibrium.ts; DESIGN.md §7.5, §8.1): two sealed tubes
 * of brown NO₂ ⇌ colourless N₂O₄. One stays in a rack at room temperature
 * (right) for comparison; the other hangs from a clamp over a water bath (hot plate
 * and steam when hot, ice when cold, a thermometer in it). Run: the tube
 * dips in and its gas turns darker or paler as the model's `color` changes.
 * After a wrong run a ghost tube in a volt wireframe cage shows the guess
 * beside it. "Zoom to particles" shows the molecules inside the tube.
 */

// Ano comes in from the left on an ANOMALY, so the comparison tube and labels sit right.
const BATH_AT: [number, number, number] = [-0.12, 0, -0.02];
const IN_BATH_Y = BATH.plate + 0.03;
const LIFT = 0.36;
const TUBE_AT: [number, number, number] = [BATH_AT[0] - 0.08, IN_BATH_Y, BATH_AT[2] + 0.06];
const GHOST_TUBE_AT: [number, number, number] = [BATH_AT[0] + 0.13, IN_BATH_Y, BATH_AT[2] + 0.11];
const REF_AT: [number, number, number] = [0.72, 0.05, 0.04];
const STAND_Z = BATH_AT[2] - 0.56;
/** The clamp holds the tube near its top, out of the particle view. */
const CLAMP_Y = IN_BATH_Y + TUBE.length - 0.09;
const GHOST_AT: [number, number, number] = [GHOST_TUBE_AT[0] + 0.02, IN_BATH_Y + TUBE.length + 0.17, GHOST_TUBE_AT[2]];

/** The tube dips into the bath in the run's first 0.3 s (the model warms it from t = 0). */
const dip = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t / 0.3))) ** 3;

function answerWord(start: number, end: number): string {
  if (end > start + 0.02) return "darker brown";
  if (end < start - 0.02) return "paler";
  return "no change";
}

export function equilibriumShots(): StageShots {
  // Aim under the bath, so the rig frames high in the clear middle above the dock.
  const aim: [number, number, number] = [0.14, 0.1, 0.05];
  return {
    arrive: orbit(aim, 8.4, 40, 30),
    build: orbit(aim, 5.0, 20),
    predict: orbit(aim, 4.6, 18, 6),
    run: orbit([0.1, 0.3, 0.05], 4.0, 16, -16),
    reveal: orbit([0.14, -0.02, 0.05], 5.4, 22),
    particles: orbit([TUBE_AT[0], 0.5, TUBE_AT[2]], 0.85, 6, 4),
  };
}

export function EquilibriumStage3D() {
  const bath = useLab((s) => {
    const v = s.build?.settings.temperature;
    return typeof v === "number" ? v : 70;
  });
  const tier = useQuality((s) => s.level);
  const zoomed = useLabUi((s) => s.particles);
  const sv = useStageValues();
  const tube = useRef<Group>(null);
  const ghostTube = useRef<Group>(null);
  const roomShare = sv.outcome?.readings["color.start"] ?? null;
  const g = sv.ghost?.readings;
  const ghostText = g ? `Your idea: ${answerWord(g["color.start"] ?? 0, g["color.end"] ?? 0)}` : null;

  useEffect(() => {
    // The bath's left side: the verdict fires at the bath and Ano stops short of the tubes.
    setAnchor("focus", new Vector3(BATH_AT[0] - 0.3, 0.45, BATH_AT[2] + 0.1));
    setAnchor("ghost", new Vector3(...GHOST_AT));
    return () => void labView.anchors.delete("ghost");
  }, []);

  useFrame(() => {
    const up = LIFT * (1 - dip(sv.t()));
    tube.current?.position.setY(up);
    ghostTube.current?.position.setY(up);
  });

  // The rack tube stays at 20 °C: the model's first frame (the same before any run).
  const room = () => roomShare ?? sv.now().color ?? 0;

  return (
    <group>
      <WaterBath3D celsius={bath} position={BATH_AT} />
      <Thermometer3D celsius={() => bath} min={0} max={100} height={0.56} position={[BATH_AT[0] + 0.2, IN_BATH_Y, BATH_AT[2] - 0.17]} />
      {/* The test tube on its clamp; the arm slides down the stand's rod with it. */}
      <group ref={tube}>
        <SealedTube3D share={() => sv.now().color ?? 0} zoomed={zoomed} position={TUBE_AT} />
        <mesh position={[TUBE_AT[0], CLAMP_Y, (TUBE_AT[2] + STAND_Z) / 2]} rotation={[Math.PI / 2, 0, 0]} material={kitMaterial("metal", tier)}>
          <cylinderGeometry args={[0.012, 0.012, TUBE_AT[2] - STAND_Z, 10]} />
        </mesh>
        <RoundedBox args={[0.17, 0.045, 0.05]} radius={0.016} position={[TUBE_AT[0], CLAMP_Y, TUBE_AT[2] - 0.05]} material={kitMaterial("orange", tier)} />
      </group>
      {sv.ghost && (
        <group ref={ghostTube}>
          <SealedTube3D share={() => sv.ghostNow()?.color ?? 0} ghost position={GHOST_TUBE_AT} />
        </group>
      )}
      <RoundedBox args={[0.3, 0.03, 0.22]} radius={0.012} position={[TUBE_AT[0], 0.015, STAND_Z]} material={kitMaterial("plastic", tier)} />
      <mesh position={[TUBE_AT[0], 0.56, STAND_Z]} material={kitMaterial("metal", tier)}>
        <cylinderGeometry args={[0.016, 0.016, 1.12, 12]} />
      </mesh>
      {/* The comparison tube in its rack, at room temperature. */}
      <RoundedBox args={[0.26, 0.12, 0.2]} radius={0.03} smoothness={3} position={[REF_AT[0], 0.06, REF_AT[2]]} material={kitMaterial("plastic", tier)} />
      <SealedTube3D share={room} position={REF_AT} />
      <Readout text={() => "20 °C (room)"} height={0.09} position={[REF_AT[0], REF_AT[1] + TUBE.length + 0.12, REF_AT[2]]} />
      <GhostLabel text={ghostText} position={GHOST_AT} />
    </group>
  );
}
