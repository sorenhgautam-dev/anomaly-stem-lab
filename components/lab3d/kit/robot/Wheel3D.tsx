"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CylinderGeometry, TorusGeometry, type Group } from "three";
import { useQuality } from "@/lib/quality";
import { kitMaterial } from "../materials";
import type { Getter } from "../chem/glass";
import { ghostMaterial } from "./looks";

/*
 * A toy wheel (DESIGN.md §7.5 kit "robot chassis and wheels"): a soft rubber
 * tyre, a glossy white hub and one orange spoke, so its spin is easy to read.
 * The axle runs along X; `spin` is the roll angle in radians (forward roll
 * is negative about X, so the wheel rolls toward −Z). The ghost is just the
 * tyre and spoke in translucent volt.
 */

export function Wheel3D({ radius, width, spin, ghost = false, position }: { radius: number; width: number; spin?: Getter<number>; ghost?: boolean; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const roll = useRef<Group>(null);
  const parts = useMemo(
    () => ({
      tyre: new TorusGeometry(radius - width * 0.42, width * 0.42, 12, 32).rotateY(Math.PI / 2),
      core: new CylinderGeometry(radius * 0.8, radius * 0.8, width * 0.86, 28).rotateZ(Math.PI / 2),
      hub: new CylinderGeometry(radius * 0.36, radius * 0.36, width * 1.12, 20).rotateZ(Math.PI / 2),
      spoke: new BoxGeometry(width * 1.04, radius * 1.5, radius * 0.24),
    }),
    [radius, width],
  );
  useEffect(() => () => Object.values(parts).forEach((g) => g.dispose()), [parts]);
  useFrame(() => {
    if (roll.current && spin) roll.current.rotation.x = spin();
  });
  if (ghost) {
    const m = ghostMaterial();
    return (
      <group position={position}>
        <mesh geometry={parts.tyre} material={m} />
      </group>
    );
  }
  return (
    <group position={position}>
      <group ref={roll}>
        <mesh geometry={parts.tyre} material={kitMaterial("rubber", tier)} />
        <mesh geometry={parts.core} material={kitMaterial("plastic", tier)} />
        <mesh geometry={parts.spoke} material={kitMaterial("orange", tier)} />
      </group>
      <mesh geometry={parts.hub} material={kitMaterial("metal", tier)} />
    </group>
  );
}
