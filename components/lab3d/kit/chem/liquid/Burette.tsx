"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CylinderGeometry, Object3D, type Group, type InstancedMesh, type Mesh } from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { kitMaterial, liquidMaterial } from "../../materials";
import type { Getter } from "../glass";

/*
 * A burette on a stand (DESIGN.md §7.5 kit, toy-like): a graduated glass
 * tube of base clamped to a metal rod, an orange tap that turns open while it
 * drips, and a fine nozzle. The group's origin is the nozzle's tip, so drops
 * start there; the stand reaches down to the bench (`bench` below the tip).
 */

const L = 0.4; // tube length
const TUBE = new CylinderGeometry(0.04, 0.04, L, 24, 1, true).translate(0, 0.1 + L / 2, 0);
const FILL = new CylinderGeometry(0.034, 0.034, 1, 20).translate(0, 0.5, 0);
const NOZZLE = new CylinderGeometry(0.018, 0.006, 0.08, 16).translate(0, 0.04, 0);
const tmp = new Object3D();

export function Burette3D({ level, open, bench, standX = -0.42, color = P.volt[100], position }: { level: Getter<number>; open: Getter<number>; bench: number; standX?: number; color?: string; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const fill = useRef<Mesh>(null);
  const tap = useRef<Group>(null);
  const ticks = useRef<InstancedMesh>(null);
  const liquid = useMemo(() => liquidMaterial(color, tier, 0.75), [color, tier]);
  const top = 0.1 + L + 0.08;

  useLayoutEffect(() => {
    const m = ticks.current;
    if (!m) return;
    for (let i = 0; i < 10; i++) {
      tmp.position.set(0.012, 0.1 + 0.04 + (i * (L - 0.08)) / 9, 0.041);
      tmp.scale.set(i % 5 === 0 ? 0.03 : 0.018, 0.004, 0.003);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  useFrame(() => {
    const k = Math.max(0.001, Math.min(1, level()));
    fill.current?.scale.set(1, k * (L - 0.02), 1);
    if (tap.current) tap.current.rotation.z = Math.max(0, Math.min(1, open())) * (Math.PI / 2);
  });

  return (
    <group position={position}>
      <mesh geometry={NOZZLE} material={kitMaterial("glass", tier)} />
      <group ref={tap} position={[0, 0.085, 0.02]}>
        <mesh material={kitMaterial("orange", tier)}>
          <boxGeometry args={[0.12, 0.026, 0.026]} />
        </mesh>
      </group>
      <mesh geometry={TUBE} material={kitMaterial("glass", tier)} />
      <mesh ref={fill} geometry={FILL} position={[0, 0.11, 0]} material={liquid} />
      <instancedMesh ref={ticks} args={[undefined, kitMaterial("ink", tier), 10]}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      {/* The stand: a base on the bench, a rod and a clamp round the tube. */}
      <RoundedBox args={[0.42, 0.04, 0.3]} radius={0.015} smoothness={3} position={[standX, -bench + 0.02, 0]} material={kitMaterial("plastic", tier)} />
      <mesh position={[standX, (top - bench) / 2, -0.02]} material={kitMaterial("metal", tier)}>
        <cylinderGeometry args={[0.016, 0.016, top + bench, 12]} />
      </mesh>
      <mesh position={[standX / 2, 0.1 + L * 0.62, -0.02]} material={kitMaterial("metal", tier)}>
        <boxGeometry args={[Math.abs(standX), 0.025, 0.025]} />
      </mesh>
      <mesh position={[0, 0.1 + L * 0.62, 0]} rotation={[Math.PI / 2, 0, 0]} material={kitMaterial("orange", tier)}>
        <torusGeometry args={[0.048, 0.012, 8, 24]} />
      </mesh>
    </group>
  );
}
