"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { LatheGeometry, Vector2, type Mesh } from "three";
import { useQuality } from "@/lib/quality";
import { kitMaterial, liquidMaterial } from "../../materials";
import type { Getter } from "../glass";

/*
 * A glass dropper (DESIGN.md §7.5 kit, toy-like): a tapered glass tube with a
 * little of its liquid in the tip and a rounded orange bulb that squashes when
 * `squeeze` (0–1) rises. Its tip is at the group's origin, so a stage moves
 * the dropper by moving a parent group.
 */

const TUBE = new LatheGeometry([new Vector2(0.005, 0), new Vector2(0.02, 0.07), new Vector2(0.02, 0.34)], 20);
const FILL = new LatheGeometry([new Vector2(0.001, 0.008), new Vector2(0.006, 0.01), new Vector2(0.016, 0.07), new Vector2(0.016, 0.12), new Vector2(0.001, 0.12)], 16);

export function Dropper3D({ color, squeeze }: { color: string; squeeze: Getter<number> }) {
  const tier = useQuality((s) => s.level);
  const bulb = useRef<Mesh>(null);
  const fill = useMemo(() => liquidMaterial(color, tier, 0.9), [color, tier]);
  useFrame(() => {
    const k = Math.max(0, Math.min(1, squeeze()));
    bulb.current?.scale.set(0.045 * (1 + k * 0.25), 0.065 * (1 - k * 0.3), 0.045 * (1 + k * 0.25));
  });
  return (
    <group>
      <mesh geometry={TUBE} material={kitMaterial("glass", tier)} />
      <mesh geometry={FILL} material={fill} />
      <mesh ref={bulb} position={[0, 0.39, 0]} scale={[0.045, 0.065, 0.045]} material={kitMaterial("orange", tier)}>
        <sphereGeometry args={[1, 18, 12]} />
      </mesh>
    </group>
  );
}
