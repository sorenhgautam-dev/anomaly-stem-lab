"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CatmullRomCurve3, Color, MeshStandardMaterial, PlaneGeometry, TorusKnotGeometry, TubeGeometry, Vector3, type Mesh, type Sprite } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { canvasTexture, corner, decalMaterial, latheGeometry, mergeParts, SANS, shellGeometry } from "../../detail";
import { glowMaterial, kitMaterial } from "../../materials";
import type { Getter } from "../glass";

/*
 * Parts for the burning stage (DESIGN.md §7.5 kit, §8 faked glass, §8.2): a
 * glass jar (real wall thickness, a screw thread round its neck) that takes
 * a sand-gold screw lid, a wad of steel wool that darkens to black oxide and
 * glows while it burns (its true orange: a glow is data, like a flame), and
 * a 9 V battery with a printed wrap whose two leads (gold +, graphite −)
 * reach into the jar to light it.
 */

/** The jar's inside, for gas clouds and VFX: radius and height in world units. */
export const JAR = { radius: 0.27, height: 0.6, neck: 0.66 };

// The jar and its screw thread: one glass mesh.
const THREAD = new TubeGeometry(
  new CatmullRomCurve3(Array.from({ length: 49 }, (_, i) => {
    const t = i / 48;
    const a = t * Math.PI * 2 * 1.6;
    return new Vector3(Math.cos(a) * 0.252, 0.612 + t * 0.034, Math.sin(a) * 0.252);
  })),
  120,
  0.0065,
  6,
);
const JAR_GLASS = mergeParts([shellGeometry([[0, 0], [0.27, 0], ...corner(0.27, 0.03, 0.03, -Math.PI / 2, 0, 5).slice(1), [0.3, 0.5], [0.292, 0.54], [0.272, 0.575], [0.252, 0.6], [0.25, 0.66]], 0.008, 0.016, 64), THREAD]);
// The lid: a flat top rounding into a ribbed skirt that screws over the thread.
const LID = latheGeometry([[0.0005, 0.07], [0.25, 0.07], [0.266, 0.066], [0.274, 0.056], [0.274, 0.008], [0.268, 0]], 56);

export function Jar3D({ sealed, position, children }: { sealed: boolean; position?: [number, number, number]; children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  return (
    <group position={position}>
      <mesh geometry={JAR_GLASS} material={kitMaterial("glass", tier)} renderOrder={2} />
      {sealed && <mesh geometry={LID} position={[0, JAR.neck - 0.005, 0]} material={kitMaterial("sand", tier)} />}
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

/** Steel wool: `oxide` 0..1 turns it from steel grey to black, `glow` 0..1 lights it the orange of glowing iron. */
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

/** The 9 V battery's printed wrap: its voltage, bold, on the gold band. */
function wrapLabel() {
  return canvasTexture("battery-9v-wrap", 192, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = P.ink[900];
    ctx.font = `800 64px ${SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("9V", w / 2, h / 2 + 4);
  });
}

const WRAP = new PlaneGeometry(0.12, 0.08);

/** A 9 V battery standing on the bench, with a gold (+) and a graphite (−) lead along the given paths. */
export function Battery9V3D({ position, leads }: { position: Vec3; leads: [Vec3[], Vec3[]] }) {
  const tier = useQuality((s) => s.level);
  const tubes = useMemo(() => leads.map((pts) => new TubeGeometry(new CatmullRomCurve3(pts.map((p) => new Vector3(...p))), 64, 0.0095, 8)), [leads]);
  useEffect(() => () => tubes.forEach((t) => t.dispose()), [tubes]);
  return (
    <group>
      <group position={position}>
        <RoundedBox args={[0.17, 0.27, 0.1]} radius={0.02} smoothness={4} position={[0, 0.135, 0]} material={kitMaterial("ink", tier)} />
        <RoundedBox args={[0.176, 0.11, 0.106]} radius={0.012} smoothness={3} position={[0, 0.15, 0]} material={kitMaterial("sand", tier)} />
        <mesh geometry={WRAP} position={[0, 0.15, 0.0535]} material={decalMaterial("battery-9v-wrap", wrapLabel())} />
        {/* The snaps: a hexagonal (−) and a round (+) terminal. */}
        <mesh position={[-0.04, 0.287, 0]} material={kitMaterial("steel", tier)}>
          <cylinderGeometry args={[0.022, 0.022, 0.03, 6]} />
        </mesh>
        <mesh position={[0.04, 0.287, 0]} material={kitMaterial("steel", tier)}>
          <cylinderGeometry args={[0.017, 0.019, 0.03, 18]} />
        </mesh>
      </group>
      <mesh geometry={tubes[0]} material={kitMaterial("sand", tier)} />
      <mesh geometry={tubes[1]} material={kitMaterial("insulation", tier)} />
    </group>
  );
}
