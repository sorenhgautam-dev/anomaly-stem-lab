"use client";

import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { CylinderGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useQuality } from "@/lib/quality";
import { kitMaterial } from "../materials";

/*
 * A battery holder for the robot kit (DESIGN.md §7.5 "battery"): an ink
 * holder with AA cells (orange wraps, metal tips, alternating ways round)
 * lying side by side. The cells are merged into two meshes (wraps, tips).
 */

const PITCH = 0.1;

export function BatteryPack3D({ cells = 4, position, rotation }: { cells?: number; position?: [number, number, number]; rotation?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const depth = cells * PITCH + 0.04;
  const geometry = useMemo(() => {
    const z = (i: number) => -depth / 2 + 0.07 + i * PITCH;
    const wraps = Array.from({ length: cells }, (_, i) => new CylinderGeometry(0.045, 0.045, 0.32, 20).rotateZ(Math.PI / 2).translate(0, 0.095, z(i)));
    const tips = Array.from({ length: cells }, (_, i) => new CylinderGeometry(0.018, 0.018, 0.02, 12).rotateZ(Math.PI / 2).translate(i % 2 ? -0.17 : 0.17, 0.095, z(i)));
    const merged = { wraps: mergeGeometries(wraps), tips: mergeGeometries(tips) };
    [...wraps, ...tips].forEach((g) => g.dispose());
    return merged;
  }, [cells, depth]);
  useEffect(() => () => Object.values(geometry).forEach((g) => g.dispose()), [geometry]);
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.42, 0.07, depth]} radius={0.025} smoothness={2} position={[0, 0.035, 0]} material={kitMaterial("ink", tier)} />
      <mesh geometry={geometry.wraps} material={kitMaterial("orange", tier)} />
      <mesh geometry={geometry.tips} material={kitMaterial("metal", tier)} />
    </group>
  );
}
