"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, LatheGeometry, Vector2, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { useQuality } from "@/lib/quality";
import { kitMaterial, ownMaterial } from "../materials";

/*
 * Glassware for the chemistry kit (DESIGN.md §7.5): a beaker, a conical
 * flask and a test tube, each with a translucent liquid whose level and
 * colour can follow the simulator every frame (pass getters). The surface
 * wobbles gently. Faked glass: gloss, tint and transparency.
 */

export type Getter<T> = () => T;

function Liquid({ radius, height, level, color, wobble = true }: { radius: number; height: number; level: Getter<number>; color: Getter<string>; wobble?: boolean }) {
  const tier = useQuality((s) => s.level);
  const geometry = useMemo(() => new CylinderGeometry(radius, radius, 1, 32).translate(0, 0.5, 0), [radius]);
  // Built once per tier (getters may be inline lambdas); the colour is set each frame.
  const material = useMemo(() => ownMaterial("#ffffff", tier, { transparent: true, opacity: 0.82 }), [tier]);
  const mesh = useRef<Mesh>(null);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const l = Math.max(0.001, Math.min(1, level()));
    m.scale.set(1, l * height, 1);
    m.visible = l > 0.002;
    (m.material as MeshStandardMaterial).color.set(color());
    if (wobble) m.rotation.z = Math.sin(state.clock.elapsedTime * 1.7) * 0.012;
  });
  return <mesh ref={mesh} geometry={geometry} material={material} position={[0, 0.012, 0]} />;
}

export function Beaker3D({ radius = 0.32, height = 0.62, level, color, position, children }: { radius?: number; height?: number; level: Getter<number>; color: Getter<string>; position?: [number, number, number]; children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  const wall = useMemo(() => new CylinderGeometry(radius, radius * 0.96, height, 40, 1, true).translate(0, height / 2, 0), [radius, height]);
  const base = useMemo(() => new CylinderGeometry(radius * 0.96, radius * 0.96, 0.02, 40).translate(0, 0.01, 0), [radius]);
  return (
    <group position={position}>
      <mesh geometry={wall} material={kitMaterial("glass", tier)} />
      <mesh geometry={base} material={kitMaterial("glass", tier)} />
      <Liquid radius={radius * 0.93} height={height * 0.96} level={level} color={color} />
      {children}
    </group>
  );
}

const FLASK: [number, number][] = [
  [0.001, 0],
  [0.4, 0],
  [0.44, 0.06],
  [0.16, 0.62],
  [0.13, 0.7],
  [0.13, 1.02],
  [0.15, 1.05],
];

export function Flask3D({ scale = 1, level, color, position, children }: { scale?: number; level: Getter<number>; color: Getter<string>; position?: [number, number, number]; children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  const glass = useMemo(() => new LatheGeometry(FLASK.map(([r, y]) => new Vector2(r, y)), 48), []);
  // Liquid: the bottom of the flask profile, scaled by level.
  const liquid = useMemo(() => new LatheGeometry([new Vector2(0.001, 0.015), new Vector2(0.4, 0.015), new Vector2(0.42, 0.06), new Vector2(0.27, 0.36), new Vector2(0.001, 0.36)].map((p) => new Vector2(p.x * 0.94, p.y)), 40), []);
  const material = useMemo(() => ownMaterial("#ffffff", tier, { transparent: true, opacity: 0.82 }), [tier]);
  const mesh = useRef<Mesh>(null);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    m.scale.set(1, Math.max(0.01, level()) * 1.1, 1);
    (m.material as MeshStandardMaterial).color.set(color());
  });
  return (
    <group position={position} scale={scale}>
      <mesh geometry={glass} material={kitMaterial("glass", tier)} />
      <mesh ref={mesh} geometry={liquid} material={material} />
      {children}
    </group>
  );
}

export function TestTube3D({ level, color, position, tilt = 0 }: { level: Getter<number>; color: Getter<string>; position?: [number, number, number]; tilt?: number }) {
  const tier = useQuality((s) => s.level);
  const g = useRef<Group>(null);
  const tube = useMemo(() => new CylinderGeometry(0.075, 0.075, 0.7, 28, 1, true).translate(0, 0.42, 0), []);
  const bottom = useMemo(() => new CylinderGeometry(0.075, 0.02, 0.07, 28).translate(0, 0.035, 0), []);
  return (
    <group ref={g} position={position} rotation={[0, 0, tilt]}>
      <mesh geometry={tube} material={kitMaterial("glass", tier)} />
      <mesh geometry={bottom} material={kitMaterial("glass", tier)} />
      <group position={[0, 0.03, 0]}>
        <Liquid radius={0.066} height={0.66} level={level} color={color} wobble={false} />
      </group>
    </group>
  );
}
