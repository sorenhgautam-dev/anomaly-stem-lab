"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, type Color, type Mesh, type MeshStandardMaterial } from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { ownMaterial } from "../../materials";
import type { Getter } from "../glass";

/*
 * A liquid column for the kit's glassware (DESIGN.md §7.5 "coloured
 * translucent volumes with a gently moving surface"), like Beaker3D's own
 * liquid but its opacity follows a getter too, so the water can fade away
 * when the camera zooms in to its molecules, and the colour can be a Color
 * the stage blends each frame.
 */

export function LiquidFill({ radius, height, level, color, opacity = () => 0.82, position }: { radius: number; height: number; level: Getter<number>; color: Getter<string | Color>; opacity?: Getter<number>; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const geometry = useMemo(() => new CylinderGeometry(radius, radius, 1, 32).translate(0, 0.5, 0), [radius]);
  const material = useMemo(() => ownMaterial(P.white, tier, { transparent: true, opacity: 0.82 }), [tier]);
  const mesh = useRef<Mesh>(null);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const l = Math.max(0.001, Math.min(1, level()));
    const a = opacity();
    m.scale.set(1, l * height, 1);
    m.visible = l > 0.002 && a > 0.01;
    const mat = m.material as MeshStandardMaterial;
    mat.color.set(color());
    mat.opacity = a;
    m.rotation.z = Math.sin(state.clock.elapsedTime * 1.7) * 0.012;
  });
  return <mesh ref={mesh} geometry={geometry} material={material} position={position ?? [0, 0.012, 0]} />;
}
