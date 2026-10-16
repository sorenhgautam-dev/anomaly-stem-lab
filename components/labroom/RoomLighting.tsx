"use client";

import { Environment, Lightformer } from "@react-three/drei";
import type { LabId } from "@/engine/types";
import { RAMP } from "@/lib/tokens";

/*
 * A studio of Lightformers rendered once into the environment map (no HDRI
 * download): soft overhead light for the glossy bench and glass, cool ion
 * strips at the sides and a little aqua, so every reflection is on-palette.
 */

export function RoomLighting({ lab }: { lab: LabId }) {
  const accent = lab === "chemistry" ? RAMP.glow[200] : RAMP.ion[300];
  return (
    <>
      <Environment resolution={256} frames={1}>
        <color attach="background" args={[RAMP.depth[950]]} />
        <Lightformer form="rect" intensity={2.2} color={RAMP.mist[100]} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[12, 2.5, 1]} />
        <Lightformer form="rect" intensity={2.6} color={RAMP.ion[400]} position={[-7, 1.5, 0]} rotation-y={Math.PI / 2} scale={[10, 0.7, 1]} />
        <Lightformer form="rect" intensity={1.8} color={accent} position={[7, 1, -1]} rotation-y={-Math.PI / 2} scale={[10, 0.5, 1]} />
        <Lightformer form="rect" intensity={0.6} color={RAMP.ion[200]} position={[0, 1.5, 9]} scale={[16, 3, 1]} />
        <Lightformer form="rect" intensity={0.35} color={RAMP.depth[700]} position={[0, 2, -9]} scale={[16, 4, 1]} />
      </Environment>
      <ambientLight color={RAMP.ion[200]} intensity={0.12} />
      <directionalLight color={RAMP.mist[100]} position={[2, 6, 4]} intensity={0.55} />
    </>
  );
}
