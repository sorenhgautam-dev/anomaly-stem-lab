"use client";

import { useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Vector3 } from "three";
import { MOTOR_RPM } from "@/engine/robotics/gears";
import { numberSetting } from "@/engine/robotics/settings";
import { useLab } from "@/lib/store";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { labView, setAnchor } from "../lab-state";
import { Readout } from "../kit/chem/instruments";
import { kitMaterial } from "../kit/materials";
import { BatteryPack3D } from "../kit/robot/BatteryPack3D";
import { Cable3D } from "../kit/robot/Cable3D";
import { GEAR_MODULE, GEAR_THICKNESS, Gear3D, pitchRadius } from "../kit/robot/Gear3D";
import { GhostNeedle3D } from "../kit/robot/GhostNeedle3D";
import { smooth } from "../kit/robot/looks";
import { BRUSHES, MotorCan3D } from "../kit/robot/MotorCan3D";
import { BrushSparks } from "../kit/robot/sparks";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Gears: speed vs strength, in 3D (stage "gears", engine/robotics/gears.ts;
 * DESIGN.md §7.5, §8.1): a motor on a black mount turns a gold motor gear
 * meshed with a white output gear, each with as many teeth as its slider
 * (one tooth size, so they always mesh). Run: both turn from the timeline's
 * driverAngle and drivenAngle; glass labels show teeth, rpm (the output's is
 * a "?" until the run), the turning force and a live count of turns. After a
 * wrong run a dashed teal needle on the output axle spins at the believed
 * speed beside the real stripe, with a dashed "Your idea" label that counts
 * the believed turns too.
 */

const BASE = 0.06;
const RAD = Math.PI / 180;

// Framed for the default 12 → 36 pair with room for two 40-tooth gears and
// the labels above them; the reveal sits higher, over the result card.
export function gearsShots(): StageShots {
  const aim: [number, number, number] = [0, 0.5, 0.1];
  return {
    arrive: orbit(aim, 8.6, 34, 30),
    build: orbit(aim, 5.0, 14, -12),
    predict: orbit(aim, 4.7, 13, -6),
    run: orbit([0.1, 0.5, 0.1], 4.5, 12, -22),
    reveal: orbit([0, 0.3, 0.1], 5.6, 14),
  };
}

// Fixed-length numbers (monospace), so a label's canvas never changes size mid-run.
const rpmText = (rpm: number) => (rpm >= 100 ? Math.round(rpm).toString() : rpm.toFixed(1)).padStart(5, " ");
const forceText = (k: number) => `×${k >= 1 ? k.toFixed(1) : k.toFixed(2)}`;
const turnsText = (deg: number) => (Math.abs(deg) / 360).toFixed(1).padStart(4, " ");

export function GearsStage3D() {
  const def = useLab((s) => s.def)!;
  const build = useLab((s) => s.build)!;
  const tier = useQuality((s) => s.level);
  const sv = useStageValues();
  const [brushes] = useState(() => new BrushSparks());
  const n1 = Math.round(numberSetting(def, build, "driver", 12));
  const n2 = Math.round(numberSetting(def, build, "driven", 36));
  const r1 = pitchRadius(n1);
  const r2 = pitchRadius(n2);
  const R1 = r1 + GEAR_MODULE;
  const R2 = r2 + GEAR_MODULE;
  const AXLE = BASE + 0.05 + Math.max(R1, R2);
  // Centres placed so the pair's outline is centred on x = 0.
  const x1 = -r2;
  const x2 = r1;
  const width = 2 * (r1 + r2) + 2 * GEAR_MODULE;
  const outRpm = sv.outcome?.readings["driven.rpm"] ?? null;
  const torque = sv.outcome?.readings["driven.torque"] ?? null;
  const ghostRpm = sv.ghost?.readings["driven.rpm"] ?? null;
  const phase2 = Math.PI - Math.PI / n2;
  const brushAt: [number, number, number] = [x1 + BRUSHES[0], AXLE + BRUSHES[1], -0.08 + BRUSHES[2]];
  const above = AXLE + R2;
  useEffect(() => {
    // Low at the front left, so Ano (who flies most of the way there) leaves the gears and labels in view.
    setAnchor("focus", new Vector3(x1 - 0.25, BASE + 0.03, 0.6));
    setAnchor("ghost", new Vector3(x2, above + 0.4, 0.05));
  }, [x1, x2, above]);
  useEffect(
    () => () => {
      labView.anchors.delete("ghost");
      labView.anchors.delete("focus");
    },
    [],
  );

  const total = sv.outcome?.timeline?.at(-1)?.t ?? 0;
  const turning = () => sv.t() > 0 && sv.t() < total;
  useFrame((_, delta) => brushes.step(Math.min(delta, 1 / 30), turning(), brushAt));

  const out = () => {
    const t = sv.t();
    const shown = outRpm === null || t <= 0 ? "    ?" : rpmText(outRpm * smooth(t / 0.6));
    const force = torque !== null && t > 0.6 ? forceText(torque).padStart(5, " ") : "    ?";
    return `output gear · ${n2} teeth\n${shown} rpm · force ${force}\nturns ${turnsText(sv.now().drivenAngle ?? 0)}`;
  };
  return (
    <group>
      <RoundedBox args={[width + 1.2, BASE, 0.7]} radius={0.025} smoothness={3} position={[-0.25, BASE / 2, -0.12]} material={kitMaterial("matte", tier, LAB.robotics.trim)} />
      <BatteryPack3D cells={2} position={[x1 - R1 - 0.42, BASE, -0.05]} rotation={[0, 0.25, 0]} />
      <Cable3D points={[[x1 - R1 - 0.22, BASE + 0.05, -0.08], [x1 - 0.3, BASE + 0.03, -0.3], [x1 - 0.06, AXLE - 0.02, -0.5], [x1, AXLE + 0.03, -0.45]]} flow={() => (turning() ? 0.5 : 0)} />
      {/* Motor gear: on the motor's shaft. */}
      <MotorCan3D position={[x1, AXLE, -0.08]} shaft={0.08} mount={AXLE - BASE} />
      <Gear3D teeth={n1} color="gold" stripe="black" angle={() => (sv.now().driverAngle ?? 0) * RAD} position={[x1, AXLE, 0]} />
      {/* Output gear: on an axle in a black post. */}
      <RoundedBox args={[0.12, AXLE - BASE + 0.06, 0.1]} radius={0.03} smoothness={2} position={[x2, BASE + (AXLE - BASE + 0.06) / 2, -0.11]} material={kitMaterial("matte", tier, LAB.robotics.trim)} />
      <mesh position={[x2, AXLE, -0.04]} rotation={[Math.PI / 2, 0, 0]} material={kitMaterial("steel", tier)}>
        <cylinderGeometry args={[0.018, 0.018, 0.16, 12]} />
      </mesh>
      <Gear3D teeth={n2} angle={() => (sv.now().drivenAngle ?? 0) * RAD} phase={phase2} position={[x2, AXLE, 0]} />
      <Readout key={`m${n1}`} text={() => `motor gear · ${n1} teeth\n${MOTOR_RPM} rpm\nturns ${turnsText(sv.now().driverAngle ?? 0)}`} height={0.076} position={[x1, AXLE + R1 + 0.17, 0.05]} />
      <Readout key={`o${n2}`} text={out} height={0.076} position={[x2, above + 0.17, 0.05]} />
      {/* Longer than the gear, so it shows past the teeth even where it lines up with the stripe. */}
      {sv.ghost && <GhostNeedle3D length={R2 + 0.12} angle={() => phase2 + (sv.ghostNow()?.drivenAngle ?? 0) * RAD} position={[x2, AXLE, GEAR_THICKNESS / 2 + 0.03]} />}
      {ghostRpm !== null && <Readout key={`g${ghostRpm}`} style="ghost" text={() => `Your idea: ${rpmText(ghostRpm).trim()} rpm\nturns ${turnsText(sv.ghostNow()?.drivenAngle ?? 0)}`} height={0.076} position={[x2, above + 0.42, 0.05]} />}
    </group>
  );
}
