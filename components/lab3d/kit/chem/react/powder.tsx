"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, LatheGeometry, MeshBasicMaterial, SphereGeometry, Vector2, type Group, type Mesh } from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { kitMaterial, liquidMaterial } from "../../materials";
import type { Getter } from "../glass";

/*
 * Catalyst powder for the chemistry kit (DESIGN.md §7.5): a small glass vial
 * of black powder that tips over inside a flask to start a reaction, and the
 * heap the powder makes, sized by its mass in grams every frame. The ghost
 * heap (the student's belief) is a dashed-looking volt wireframe: a
 * different shape and opacity, not only a different colour.
 */

const VIAL = new CylinderGeometry(0.042, 0.042, 0.17, 20, 1, true).translate(0, 0.085, 0);
const VIAL_BASE = new CylinderGeometry(0.042, 0.042, 0.008, 20).translate(0, 0.004, 0);
const INSIDE = new CylinderGeometry(0.036, 0.036, 1, 16).translate(0, 0.5, 0);
// A low mound with a flat base at y = 0.
const HEAP = new SphereGeometry(1, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1);

/**
 * A clear liquid for inside Flask3D (as its child, in the flask's units), `level` 0..1 as
 * Flask3D's. Lighter than Flask3D's own liquid, so a powder on the bottom stays visible.
 */
export function ClearFlaskLiquid({ level, color }: { level: number; color: string }) {
  const tier = useQuality((s) => s.level);
  const geometry = useMemo(() => new LatheGeometry([new Vector2(0.001, 0.016), new Vector2(0.376, 0.016), new Vector2(0.395, 0.06), new Vector2(0.254, 0.36), new Vector2(0.001, 0.36)], 40).scale(1, level * 1.1, 1), [level]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={liquidMaterial(color, tier, 0.4)} renderOrder={1} />;
}

/** Radius of a heap of `grams` of powder (volume grows with mass); 1 g ≈ 0.13 units. */
export function heapRadius(grams: number): number {
  return 0.13 * Math.cbrt(Math.max(0, grams));
}

/** A vial standing on its base; `tip` 0..1 lays it over to the right, `grams` fills it while upright. */
export function Vial3D({ tip, grams, position }: { tip: Getter<number>; grams: Getter<number>; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const pivot = useRef<Group>(null);
  const fill = useRef<Mesh>(null);
  useFrame(() => {
    const k = Math.max(0, Math.min(1, tip()));
    if (pivot.current) pivot.current.rotation.z = -(1 - (1 - k) ** 3) * 1.5;
    if (fill.current) {
      const h = Math.min(0.12, 0.055 * grams()) * (1 - k);
      fill.current.scale.set(1, Math.max(0.001, h), 1);
      fill.current.visible = h > 0.002;
    }
  });
  return (
    <group position={position}>
      {/* Pivot on the right-hand bottom edge, so it falls that way. */}
      <group position={[0.042, 0, 0]}>
        <group ref={pivot}>
          <group position={[-0.042, 0, 0]}>
            <mesh geometry={VIAL} material={kitMaterial("glass", tier)} renderOrder={2} />
            <mesh geometry={VIAL_BASE} material={kitMaterial("glass", tier)} />
            <mesh ref={fill} geometry={INSIDE} position={[0, 0.008, 0]} material={kitMaterial("ink", tier)} />
          </group>
        </group>
      </group>
    </group>
  );
}

/** A heap of powder whose size follows `grams`; `ghost` draws it as a volt wireframe. */
export function PowderHeap3D({ grams, ghost = false, position }: { grams: Getter<number>; ghost?: boolean; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const heap = useRef<Mesh>(null);
  const wire = useMemo(() => (ghost ? new MeshBasicMaterial({ color: P.volt[500], wireframe: true, transparent: true, opacity: 0.85, depthWrite: false }) : null), [ghost]);
  useEffect(() => () => wire?.dispose(), [wire]);
  useFrame(() => {
    const r = heapRadius(grams());
    if (heap.current) {
      heap.current.scale.setScalar(Math.max(0.001, r));
      heap.current.visible = r > 0.004;
    }
  });
  return <mesh ref={heap} geometry={HEAP} position={position} material={wire ?? kitMaterial("ink", tier)} renderOrder={ghost ? 5 : 0} />;
}
