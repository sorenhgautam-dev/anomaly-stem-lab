"use client";

import { RAMP } from "@/lib/tokens";
import { roomGeos } from "../geometry";
import { roomMats } from "../materials";
import { WallPanels, type PanelWall } from "../WallPanels";

/*
 * Bench equipment silhouettes: a bench power supply, an oscilloscope with a
 * live trace, and a little two-wheeled robot. Their status LEDs live in
 * RoboticsRoom (one draw for all of them).
 */

const SCOPE_SCREEN: PanelWall = {
  origin: [-0.15, -0.085, 0],
  cols: 1,
  rows: 1,
  size: [0.3, 0.17],
  gap: 0,
  screens: ["0,0"],
  edge: RAMP.ion[400],
  screen: RAMP.glow[400],
};

export function PowerSupply({ at, turn = 0 }: { at: [number, number, number]; turn?: number }) {
  const g = roomGeos();
  const m = roomMats();
  return (
    <group position={at} rotation-y={turn}>
      <mesh geometry={g.rounded} material={m.plastic} position={[0, 0.1, 0]} scale={[0.38, 0.2, 0.28]} />
      <mesh geometry={g.plane} material={m.screenGlow} position={[-0.07, 0.13, 0.141]} scale={[0.15, 0.05, 1]} />
      {[0.07, 0.13].map((x) => (
        <mesh key={x} geometry={g.disc} material={m.chrome} position={[x, 0.12, 0.15]} rotation-x={Math.PI / 2} scale={[0.04, 0.025, 0.04]} />
      ))}
      {[-0.12, -0.08].map((x, i) => (
        <mesh key={x} geometry={g.disc} material={i ? m.stripIon : m.stripGlow} position={[x, 0.05, 0.145]} rotation-x={Math.PI / 2} scale={[0.022, 0.01, 0.022]} />
      ))}
    </group>
  );
}

export function Oscilloscope({ at, turn = 0 }: { at: [number, number, number]; turn?: number }) {
  const g = roomGeos();
  const m = roomMats();
  return (
    <group position={at} rotation-y={turn}>
      <mesh geometry={g.rounded} material={m.plastic} position={[0, 0.14, 0]} scale={[0.46, 0.28, 0.3]} />
      <group position={[-0.05, 0.15, 0.152]}>
        <WallPanels wall={SCOPE_SCREEN} />
      </group>
      {[0.15, 0.19].map((x) =>
        [0.2, 0.13, 0.06].map((y) => <mesh key={`${x},${y}`} geometry={g.disc} material={m.chrome} position={[x, y, 0.155]} rotation-x={Math.PI / 2} scale={[0.024, 0.016, 0.024]} />),
      )}
    </group>
  );
}

export function LittleRobot({ at, turn = 0 }: { at: [number, number, number]; turn?: number }) {
  const g = roomGeos();
  const m = roomMats();
  return (
    <group position={at} rotation-y={turn}>
      <mesh geometry={g.rounded} material={m.chrome} position={[0, 0.075, 0]} scale={[0.2, 0.09, 0.16]} />
      <mesh geometry={g.rounded} material={m.plastic} position={[0, 0.135, 0.01]} scale={[0.12, 0.05, 0.1]} />
      <mesh geometry={g.box} material={m.stripGlow} position={[0, 0.14, 0.061]} scale={[0.07, 0.012, 0.004]} />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={g.wheel} material={m.darkMetal} position={[s * 0.115, 0.045, 0]} scale={[0.03, 0.09, 0.09]} />
      ))}
    </group>
  );
}
