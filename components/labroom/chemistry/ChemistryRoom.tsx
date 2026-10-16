"use client";

import { useMemo } from "react";
import { mulberry32 } from "@/components/landing/random";
import { RAMP } from "@/lib/tokens";
import { Beams, RoomDust, StatusLights, type BeamSpec, type LightSpec } from "../Atmosphere";
import { Bench, MirrorTop } from "../Bench";
import { roomGeos, VESSELS } from "../geometry";
import { roomMats } from "../materials";
import { WallPanels, type PanelWall } from "../WallPanels";
import { FumeHood } from "./FumeHood";
import { Glassware, type Piece } from "./Glassware";
import { HoodProps } from "./HoodProps";

/*
 * The chemistry lab (CLAUDE.md §3.6.2): a glossy dark bench, a fume hood
 * round the experiment, a back wall of softly lit panels and screens,
 * shelves of glassware silhouettes, and light beams with drifting dust.
 */

const WALL: PanelWall = {
  origin: [-6.3, -0.95, -3.7],
  cols: 12,
  rows: 6,
  size: [0.98, 0.66],
  gap: 0.07,
  screens: ["2,3", "8,4", "9,2", "3,5", "6,5"],
  edge: RAMP.ion[400],
  screen: RAMP.glow[400],
};

const BEAMS: BeamSpec[] = [
  { at: [-3.1, 3.3, -2.4], length: 4.4, spread: 1.5, tilt: [0.05, -0.22], color: RAMP.ion[300], intensity: 0.9 },
  { at: [3.3, 3.3, -2.1], length: 4.6, spread: 1.7, tilt: [0.08, 0.26], color: RAMP.glow[200], intensity: 0.6 },
  { at: [0.4, 3.4, -2.9], length: 4.2, spread: 1.2, tilt: [-0.1, 0.05], color: RAMP.ion[200], intensity: 0.5 },
];

const LIGHTS: LightSpec[] = [
  { at: [-4.6, -0.16, 0.56], color: RAMP.glow[400], rate: 0 },
  { at: [-4.45, -0.16, 0.56], color: RAMP.ion[300], rate: 0.7 },
  { at: [4.3, -0.16, 0.56], color: RAMP.glow[400], rate: 1.3 },
  { at: [4.45, -0.16, 0.56], color: RAMP.ion[300], rate: 0 },
  { at: [-2.3, 1.62, -3.15], color: RAMP.glow[400], rate: 0.5 },
  { at: [2.3, 0.88, -3.15], color: RAMP.ion[300], rate: 0.9 },
];

const SHELVES: [number, number][] = [
  [-3.25, 0.85],
  [-3.25, 1.6],
  [3.25, 0.85],
  [3.25, 1.6],
];

const DUST_BOX: [[number, number], [number, number], [number, number]] = [
  [-4.8, 4.8],
  [-0.3, 3],
  [-3.3, 1.2],
];
const DUST_COLORS = [RAMP.mist[100], RAMP.ion[200], RAMP.glow[200]];

export function ChemistryRoom({ high }: { high: boolean }) {
  const g = roomGeos();
  const m = roomMats();
  const pieces = useMemo(() => {
    const rand = mulberry32(21);
    const out: Piece[] = [];
    for (const [x, y] of SHELVES) {
      let cursor = x - 0.9;
      while (cursor < x + 0.85) {
        const vessel = VESSELS[Math.floor(rand() * VESSELS.length)];
        out.push({ vessel, at: [cursor, y + 0.015, -3.38 + rand() * 0.06], scale: 0.9 + rand() * 0.5, tint: Math.floor(rand() * 4) });
        cursor += 0.17 + rand() * 0.14;
      }
    }
    return out;
  }, []);

  return (
    <group>
      <Bench width={14} back={-0.9} front={0.55} edge={m.stripIon} />
      {high && <MirrorTop width={14} back={-0.9} front={0.55} />}
      <FumeHood />
      <HoodProps />
      <WallPanels wall={WALL} />
      {SHELVES.map(([x, y]) => (
        <group key={`${x},${y}`}>
          <mesh geometry={g.box} material={m.metal} position={[x, y, -3.4]} scale={[2.1, 0.03, 0.34]} />
          <mesh geometry={g.box} material={m.stripIon} position={[x, y - 0.017, -3.235]} scale={[2.06, 0.004, 0.004]} />
        </group>
      ))}
      <Glassware pieces={pieces} />
      <Beams beams={BEAMS} />
      <RoomDust count={high ? 700 : 300} box={DUST_BOX} colors={DUST_COLORS} />
      <StatusLights lights={LIGHTS} />
    </group>
  );
}
