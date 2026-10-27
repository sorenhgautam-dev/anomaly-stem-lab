"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CatmullRomCurve3, Color, LatheGeometry, MeshStandardMaterial, TorusKnotGeometry, TubeGeometry, Vector2, Vector3, type Mesh, type Sprite } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { glowMaterial, kitMaterial } from "../../materials";
import type { Getter } from "../glass";

/*
 * Parts for the burning stage (DESIGN.md §7.5 kit, §8 faked glass): a glass
 * jar that takes a screw lid, a wad of steel wool that darkens to black
 * oxide and glows orange while it burns, and a 9 V battery whose two leads
 * reach into the jar to light it.
 */

/** The jar's inside, for gas clouds and VFX: radius and height in world units. */
export const JAR = { radius: 0.27, height: 0.6, neck: 0.66 };

const JAR_GLASS = new LatheGeometry(
  [
    [0.001, 0],
    [0.27, 0],
    [0.3, 0.035],
    [0.3, 0.5],
    [0.285, 0.565],
    [0.25, 0.605],
    [0.25, 0.66],
  ].map(([r, y]) => new Vector2(r, y)),
  48,
);

export function Jar3D({ sealed, position, children }: { sealed: boolean; position?: [number, number, number]; children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  return (
    <group position={position}>
      <mesh geometry={JAR_GLASS} material={kitMaterial("glass", tier)} renderOrder={2} />
      {/* The screw thread at the neck. */}
      <mesh position={[0, 0.63, 0]} rotation={[Math.PI / 2, 0, 0]} material={kitMaterial("glass", tier)}>
        <torusGeometry args={[0.252, 0.012, 8, 48]} />
      </mesh>
      {sealed && (
        <group position={[0, JAR.neck + 0.03, 0]}>
          <mesh material={kitMaterial("orange", tier)}>
            <cylinderGeometry args={[0.27, 0.27, 0.07, 40]} />
          </mesh>
          <mesh position={[0, 0.036, 0]} material={kitMaterial("plastic", tier)}>
            <cylinderGeometry args={[0.22, 0.22, 0.006, 40]} />
          </mesh>
        </group>
      )}
      {children}
    </group>
  );
}

// A loose tangle: three thin knots of different shapes, merged into one mesh.
const WOOL = mergeGeometries(
  [
    new TorusKnotGeometry(0.1, 0.006, 180, 5, 3, 7),
    new TorusKnotGeometry(0.085, 0.006, 160, 5, 5, 4).rotateX(1.2).rotateY(0.5),
    new TorusKnotGeometry(0.095, 0.005, 160, 5, 2, 9).rotateZ(1.4).rotateX(0.6),
  ].map((g) => g.scale(1.25, 0.6, 1.1)),
);
const STEEL = new Color(P.ink[300]);
const OXIDE = new Color(P.ink[900]);

/** Steel wool: `oxide` 0..1 turns it from steel grey to black, `glow` 0..1 lights it orange. */
export function SteelWool3D({ oxide, glow, position }: { oxide: Getter<number>; glow: Getter<number>; position?: [number, number, number] }) {
  const wool = useRef<Mesh>(null);
  const halo = useRef<Sprite>(null);
  const core = useRef<Sprite>(null);
  const material = useMemo(() => new MeshStandardMaterial({ color: P.ink[300], metalness: 0.75, roughness: 0.42, emissive: P.apricot[500], emissiveIntensity: 0 }), []);
  const outer = useMemo(() => glowMaterial(P.apricot[400]), []);
  const inner = useMemo(() => glowMaterial(P.apricot[200]), []);
  useEffect(
    () => () => {
      material.dispose();
      outer.dispose();
      inner.dispose();
    },
    [material, outer, inner],
  );
  useFrame(({ clock }) => {
    const g = Math.max(0, Math.min(1, glow()));
    const flicker = 1 + Math.sin(clock.elapsedTime * 29) * 0.08 + Math.sin(clock.elapsedTime * 47) * 0.06;
    const m = wool.current?.material as MeshStandardMaterial | undefined;
    if (m) {
      m.color.copy(STEEL).lerp(OXIDE, Math.min(1, oxide() * 2));
      m.emissiveIntensity = g * 2.4 * flicker;
    }
    if (halo.current) {
      halo.current.scale.setScalar((0.35 + g * 0.45) * flicker);
      (halo.current.material as typeof outer).opacity = Math.min(0.9, g * 1.1);
    }
    if (core.current) {
      core.current.scale.setScalar(0.18 + g * 0.16);
      (core.current.material as typeof inner).opacity = Math.min(0.85, g * 1.2);
    }
  });
  return (
    <group position={position}>
      <mesh ref={wool} geometry={WOOL} material={material} />
      <sprite ref={halo} material={outer} renderOrder={3} />
      <sprite ref={core} material={inner} renderOrder={4} />
    </group>
  );
}

type Vec3 = [number, number, number];

/** A 9 V battery standing on the bench with a red and a black lead along the given paths. */
export function Battery9V3D({ position, leads }: { position: Vec3; leads: [Vec3[], Vec3[]] }) {
  const tier = useQuality((s) => s.level);
  const tubes = useMemo(() => leads.map((pts) => new TubeGeometry(new CatmullRomCurve3(pts.map((p) => new Vector3(...p))), 64, 0.009, 6)), [leads]);
  useEffect(() => () => tubes.forEach((t) => t.dispose()), [tubes]);
  return (
    <group>
      <group position={position}>
        <RoundedBox args={[0.17, 0.27, 0.1]} radius={0.02} smoothness={3} position={[0, 0.135, 0]} material={kitMaterial("ink", tier)} />
        <RoundedBox args={[0.175, 0.11, 0.105]} radius={0.012} smoothness={2} position={[0, 0.15, 0]} material={kitMaterial("orange", tier)} />
        <mesh position={[-0.04, 0.29, 0]} material={kitMaterial("metal", tier)}>
          <cylinderGeometry args={[0.022, 0.022, 0.03, 6]} />
        </mesh>
        <mesh position={[0.04, 0.29, 0]} material={kitMaterial("metal", tier)}>
          <cylinderGeometry args={[0.018, 0.018, 0.03, 16]} />
        </mesh>
      </group>
      <mesh geometry={tubes[0]} material={kitMaterial("orange", tier)} />
      <mesh geometry={tubes[1]} material={kitMaterial("ink", tier)} />
    </group>
  );
}
