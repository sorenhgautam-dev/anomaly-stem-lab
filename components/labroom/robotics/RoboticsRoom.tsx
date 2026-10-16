"use client";

import { useEffect, useMemo } from "react";
import { RAMP } from "@/lib/tokens";
import { Beams, RoomDust, StatusLights, type BeamSpec, type LightSpec } from "../Atmosphere";
import { Bench } from "../Bench";
import { roomGeos } from "../geometry";
import { roomMats } from "../materials";
import { usePulse } from "../pulses";
import { matMaterial, pegboardMaterial } from "../shaders/surfaces";
import { LittleRobot, Oscilloscope, PowerSupply } from "./Devices";
import { HoloBoard } from "./HoloBoard";
import { RobotArm } from "./RobotArm";

/*
 * The robotics lab (CLAUDE.md §3.6.2): a workbench with a glowing
 * cutting-mat grid, a pegboard wall hung with tool silhouettes, bench
 * equipment, an idling robot arm, and the holo board the circuit is drawn
 * on. The robot stage lights neon lane lines on the mat (see pulses.ts).
 */

const WALL_Z = -2.05;

const BEAMS: BeamSpec[] = [
  { at: [-2.6, 3.4, -1.2], length: 4.2, spread: 1.4, tilt: [0.12, -0.2], color: RAMP.ion[300], intensity: 0.8 },
  { at: [2.9, 3.4, -0.9], length: 4.3, spread: 1.6, tilt: [0.1, 0.24], color: RAMP.glow[200], intensity: 0.55 },
];

const LIGHTS: LightSpec[] = [
  { at: [2.0, 0.05, -1.29], color: RAMP.glow[400], rate: 1.1 },
  { at: [2.06, 0.05, -1.29], color: RAMP.ion[300], rate: 0 },
  { at: [-1.95, 0.27, -1.27], color: RAMP.glow[400], rate: 0.6 },
  { at: [-1.25, 0.03, -1.45], color: RAMP.ion[300], rate: 1.7 },
  { at: [-3.4, 2.55, WALL_Z + 0.02], color: RAMP.glow[400], rate: 0 },
  { at: [3.6, 2.55, WALL_Z + 0.02], color: RAMP.ion[300], rate: 0.4 },
];

const DUST_BOX: [[number, number], [number, number], [number, number]] = [
  [-4.5, 4.5],
  [0, 3],
  [-2, 1.4],
];
const DUST_COLORS = [RAMP.mist[100], RAMP.ion[200], RAMP.glow[200]];

export function RoboticsRoom({ high }: { high: boolean }) {
  const g = roomGeos();
  const m = roomMats();
  const mat = useMemo(() => matMaterial(), []);
  const pegboard = useMemo(() => pegboardMaterial(), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useEffect(() => () => pegboard.dispose(), [pegboard]);
  usePulse(mat, pegboard);

  return (
    <group>
      <Bench width={12} back={WALL_Z + 0.02} front={0.8} top={mat} edge={m.stripIon} />
      <mesh geometry={g.plane} material={pegboard} position={[0, 1.45, WALL_Z]} scale={[11, 2.9, 1]} />
      <mesh geometry={g.box} material={m.stripIon} position={[0, 2.92, WALL_Z + 0.02]} scale={[11, 0.012, 0.012]} />
      {/* Tool silhouettes hung low and to the sides, clear of the board's middle. */}
      <mesh geometry={g.tools} material={m.darkMetal} position={[-3.6, 0.95, WALL_Z + 0.03]} />
      <mesh geometry={g.tools} material={m.darkMetal} position={[1.9, 1.05, WALL_Z + 0.03]} rotation-z={0.02} />
      <HoloBoard />
      <RobotArm at={[-1.85, 0, -1.25]} turn={0.5} />
      <PowerSupply at={[2.05, 0, -1.42]} turn={-0.35} />
      <Oscilloscope at={[-2.7, 0, -1.3]} turn={0.4} />
      <LittleRobot at={[1.5, 0, -0.55]} turn={-0.7} />
      <Beams beams={BEAMS} />
      <RoomDust count={high ? 600 : 260} box={DUST_BOX} colors={DUST_COLORS} />
      <StatusLights lights={LIGHTS} />
    </group>
  );
}
