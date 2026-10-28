"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CylinderGeometry, type BufferGeometry, type Group } from "three";
import { useQuality } from "@/lib/quality";
import { corner, latheGeometry, type Profile } from "../detail";
import { kitMaterial } from "../materials";
import type { Getter } from "../chem/glass";
import { ghostMaterial } from "./looks";

/*
 * A robot wheel (DESIGN.md §7.5 kit "robot chassis and wheels", §8.2): a
 * rubber tyre with rounded shoulders and chevron tread lugs, a white dished
 * rim, a steel hub cap and one gold spoke right through, so its spin is easy
 * to read. The axle runs along X; `spin` is the roll angle in radians
 * (forward roll is negative about X, so the wheel rolls toward −Z). The
 * ghost is just the tyre in translucent teal.
 */

const LUGS = 22;

/** The tyre: a rounded section lathed round the axle, its tread pressed into lugs. */
function tyreGeometry(radius: number, width: number): BufferGeometry {
  const inner = radius * 0.7;
  const c = width * 0.28;
  const section: Profile = [
    [inner, -width / 2],
    [radius - c, -width / 2],
    ...corner(radius - c, -width / 2 + c, c, -Math.PI / 2, 0, 5).slice(1),
    [radius, 0],
    ...corner(radius - c, width / 2 - c, c, 0, Math.PI / 2, 5),
    [inner, width / 2],
  ];
  const g = latheGeometry(section, 132);
  const p = g.attributes.position;
  const depth = radius * 0.05;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < radius - c * 0.7) continue;
    // Chevrons: each lug leans back from the centre line, so the tread reads as a tyre's, not a gear's.
    const phi = Math.atan2(z, x) + (Math.abs(p.getY(i)) / width) * 0.5;
    const lug = 0.5 + 0.5 * Math.tanh(4 * Math.sin(phi * LUGS));
    const s = (r - depth * (1 - lug)) / r;
    p.setX(i, x * s);
    p.setZ(i, z * s);
  }
  g.computeVertexNormals();
  return g.rotateZ(Math.PI / 2);
}

/** The rim: a white dish inside the tyre, its face set back, round the hub. */
function rimGeometry(radius: number, width: number): BufferGeometry {
  const w = width / 2;
  return latheGeometry(
    [
      [0.001, -w * 0.62],
      [radius * 0.3, -w * 0.66],
      [radius * 0.66, -w * 0.84],
      [radius * 0.72, -w * 0.84],
      [radius * 0.72, w * 0.84],
      [radius * 0.66, w * 0.84],
      [radius * 0.3, w * 0.66],
      [0.001, w * 0.62],
    ],
    40,
  ).rotateZ(Math.PI / 2);
}

export function Wheel3D({ radius, width, spin, ghost = false, position }: { radius: number; width: number; spin?: Getter<number>; ghost?: boolean; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const roll = useRef<Group>(null);
  const parts = useMemo(
    () => ({
      tyre: tyreGeometry(radius, width),
      rim: rimGeometry(radius, width),
      hub: new CylinderGeometry(radius * 0.2, radius * 0.22, width * 1.5, 24).rotateZ(Math.PI / 2),
      spoke: new BoxGeometry(width * 1.4, radius * 1.3, radius * 0.14),
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
        <mesh geometry={parts.rim} material={kitMaterial("plastic", tier)} />
        <mesh geometry={parts.spoke} material={kitMaterial("gold", tier)} />
      </group>
      <mesh geometry={parts.hub} material={kitMaterial("steel", tier)} />
    </group>
  );
}
