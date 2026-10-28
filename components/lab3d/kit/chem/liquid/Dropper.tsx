"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { type Mesh } from "three";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { latheGeometry } from "../../detail";
import { kitMaterial, liquidMaterial } from "../../materials";
import type { Getter } from "../glass";

/*
 * A glass dropper (DESIGN.md §7.5 kit, §8.2): a slim glass pipette that
 * tapers to a fine tip, a little of its liquid held in the tip, and a lathed
 * rubber teat (matte sand gold) that squashes from its base when `squeeze`
 * (0–1) rises. Its tip is at the group's origin, so a stage moves the
 * dropper by moving a parent group.
 */

const NECK = 0.33;
const TUBE = latheGeometry([[0.0035, 0], [0.0055, 0.012], [0.015, 0.075], [0.016, NECK], [0.019, NECK + 0.006], [0.019, NECK + 0.012]], 24);
const FILL = latheGeometry([[0.001, 0.008], [0.0045, 0.012], [0.0125, 0.07], [0.0125, 0.12], [0.001, 0.12]], 16);
// The teat sleeves over the pipette's top and swells into a rounded bulb.
const TEAT = latheGeometry([[0.021, -0.03], [0.0225, 0], [0.025, 0.018], [0.038, 0.042], [0.045, 0.07], [0.043, 0.094], [0.033, 0.114], [0.016, 0.125], [0.0005, 0.127]], 28);

export function Dropper3D({ color, squeeze }: { color: string; squeeze: Getter<number> }) {
  const tier = useQuality((s) => s.level);
  const bulb = useRef<Mesh>(null);
  const fill = useMemo(() => liquidMaterial(color, tier, 0.9), [color, tier]);
  useFrame(() => {
    const k = Math.max(0, Math.min(1, squeeze()));
    bulb.current?.scale.set(1 + k * 0.25, 1 - k * 0.3, 1 + k * 0.25);
  });
  return (
    <group>
      <mesh geometry={TUBE} material={kitMaterial("glass", tier)} renderOrder={2} />
      <mesh geometry={FILL} material={fill} />
      <mesh ref={bulb} geometry={TEAT} position={[0, NECK, 0]} material={kitMaterial("matte", tier, LAB.chemistry.gold)} />
    </group>
  );
}
