"use client";

import { MeshReflectorMaterial } from "@react-three/drei";
import type { Material } from "three";
import { RAMP } from "@/lib/tokens";
import { roomGeos } from "./geometry";
import { roomMats } from "./materials";

/*
 * The workbench both labs are built round: top surface at y = 0, cabinets
 * below, a thin light along the front edge and a dark floor under it all.
 * `top` replaces the top face (the robotics cutting mat).
 */

const HEIGHT = 0.95;

export function Bench({ width, back, front, top, edge }: { width: number; back: number; front: number; top?: Material; edge: Material }) {
  const g = roomGeos();
  const m = roomMats();
  const depth = front - back;
  const z = (back + front) / 2;
  return (
    <group>
      <mesh geometry={g.box} material={m.benchTop} position={[0, -0.025, z]} scale={[width, 0.05, depth]} />
      {top && <mesh geometry={g.plane} material={top} position={[0, 0.0006, z]} rotation-x={-Math.PI / 2} scale={[width, depth, 1]} />}
      <mesh geometry={g.box} material={m.benchBody} position={[0, -HEIGHT / 2 - 0.03, z - 0.04]} scale={[width - 0.1, HEIGHT - 0.06, depth - 0.08]} />
      {/* Drawer seams on the cabinet front. */}
      {[-0.32, -0.62].map((y) => (
        <mesh key={y} geometry={g.box} material={m.darkMetal} position={[0, y, front - 0.075]} scale={[width - 0.12, 0.006, 0.01]} />
      ))}
      <mesh geometry={g.box} material={edge} position={[0, -0.006, front + 0.002]} scale={[width, 0.004, 0.004]} />
      <mesh geometry={g.plane} material={m.floor} position={[0, -HEIGHT, 0]} rotation-x={-Math.PI / 2} scale={[40, 30, 1]} />
    </group>
  );
}

/**
 * High quality only: a real mirror finish on the bench top, so the hood's
 * light strip and the glassware reflect in the black epoxy (one extra,
 * low-resolution render of the room).
 */
export function MirrorTop({ width, back, front }: { width: number; back: number; front: number }) {
  return (
    <mesh position={[0, 0.0008, (back + front) / 2]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[width, front - back]} />
      <MeshReflectorMaterial
        resolution={512}
        blur={[220, 60]}
        mixBlur={0.75}
        mixStrength={9}
        mixContrast={1.1}
        roughness={0.55}
        metalness={0.4}
        depthScale={0.6}
        minDepthThreshold={0.3}
        maxDepthThreshold={1.2}
        envMapIntensity={0.15}
        color={RAMP.depth[950]}
      />
    </mesh>
  );
}
