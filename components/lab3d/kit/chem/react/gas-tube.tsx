"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, CylinderGeometry, LatheGeometry, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, SRGBColorSpace, Vector2, type Mesh } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { kitMaterial } from "../../materials";
import type { Getter } from "../glass";
import { MoleculeCloud, N2O4_SHAPE, NO2_SHAPE } from "./molecules";

/*
 * A sealed glass tube of nitrogen dioxide (DESIGN.md §7.5 kit, §8 faked
 * glass). `share` (a getter read every frame) is the share of the tube's
 * nitrogen held as brown NO₂, as engine/chemistry/equilibrium.ts's `color`:
 * the gas goes from almost clear to deep brown with it. Zoomed to particles,
 * brown NO₂ and colourless N₂O₄ molecules tumble inside in that balance. The
 * ghost version (the student's belief) wears a volt wireframe cage.
 */

export const TUBE = { radius: 0.07, length: 0.7 };
const R = TUBE.radius;
const SHOULDER = TUBE.length - 0.075;

const WALL = new CylinderGeometry(R, R, SHOULDER - R, 28, 1, true).translate(0, R + (SHOULDER - R) / 2, 0);
const BOTTOM = new SphereGeometry(R, 28, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, R, 0);
// The sealed top: the glass narrows to a melted tip.
const SEAL = new LatheGeometry(
  [
    [R, 0],
    [R * 0.8, 0.035],
    [0.022, 0.06],
    [0.012, 0.075],
    [0.001, 0.078],
  ].map(([r, y]) => new Vector2(r, y)),
  28,
).translate(0, SHOULDER, 0);
const GAS = mergeGeometries([new CylinderGeometry(R * 0.88, R * 0.88, SHOULDER - R, 20, 1, true).translate(0, R + (SHOULDER - R) / 2, 0), new SphereGeometry(R * 0.88, 20, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, R, 0), new SphereGeometry(R * 0.88, 20, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1).translate(0, SHOULDER, 0)]);
const CAGE = new CylinderGeometry(R * 1.12, R * 1.12, TUBE.length, 8, 5, true).translate(0, TUBE.length / 2, 0);

// Mixed in sRGB (as paint would), so the brown deepens evenly instead of staying pale.
const CLEAR = new Color(P.cream[100]).getRGB(new Color(), SRGBColorSpace);
const BROWN = new Color(P.apricot[700]).lerp(new Color(P.ink[900]), 0.28).getRGB(new Color(), SRGBColorSpace);
const NITROGENS = 36;

/** How brown the gas looks for an NO₂ share: about 0.15 in ice water (0.07), 0.33 at 20 °C (0.16), 0.94 at 70 °C (0.57). */
export function brownness(share: number): number {
  return Math.max(0, Math.min(1, (share - 0.02) / 0.6)) ** 0.75;
}

export function SealedTube3D({ share, ghost = false, zoomed = false, position }: { share: Getter<number>; ghost?: boolean; zoomed?: boolean; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const gas = useRef<Mesh>(null);
  // Unlit and not tone mapped: a gas has no gloss, and reflections or tone mapping would wash its brown out.
  const material = useMemo(() => new MeshBasicMaterial({ color: P.cream[100], transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false }), []);
  const no2 = useMemo(() => new MeshStandardMaterial({ color: P.apricot[700], roughness: 0.35 }), []);
  // Colourless N₂O₄ in a soft grey, so it reads against the pale glass.
  const n2o4 = useMemo(() => new MeshStandardMaterial({ color: P.ink[300], roughness: 0.4 }), []);
  const cage = useMemo(() => (ghost ? new MeshBasicMaterial({ color: P.volt[500], wireframe: true, transparent: true, opacity: 0.75, depthWrite: false }) : null), [ghost]);
  useEffect(
    () => () => {
      material.dispose();
      no2.dispose();
      n2o4.dispose();
      cage?.dispose();
    },
    [material, no2, n2o4, cage],
  );
  useFrame(() => {
    const m = gas.current?.material as MeshBasicMaterial | undefined;
    if (!m) return;
    const k = brownness(share());
    m.color.setRGB(CLEAR.r + (BROWN.r - CLEAR.r) * k, CLEAR.g + (BROWN.g - CLEAR.g) * k, CLEAR.b + (BROWN.b - CLEAR.b) * k, SRGBColorSpace);
    m.opacity = (0.12 + 0.82 * k) * (ghost ? 0.7 : 1) * (zoomed ? 0.35 : 1);
  });
  // Molecules split the tube's nitrogen: each NO₂ holds one, each N₂O₄ two.
  const no2Share = () => Math.max(0, Math.min(1, share()));
  return (
    <group position={position}>
      <mesh ref={gas} geometry={GAS} material={material} renderOrder={1} />
      <mesh geometry={WALL} material={kitMaterial("glass", tier)} renderOrder={2} />
      <mesh geometry={BOTTOM} material={kitMaterial("glass", tier)} renderOrder={2} />
      <mesh geometry={SEAL} material={kitMaterial("glass", tier)} renderOrder={2} />
      {cage && <mesh geometry={CAGE} material={cage} renderOrder={4} />}
      {!ghost && (
        <group position={[0, 0.02, 0]}>
          <MoleculeCloud shape={NO2_SHAPE} material={no2} count={() => no2Share() * NITROGENS} radius={R * 0.85} height={SHOULDER} size={0.011} speed={0.5} max={NITROGENS} visible={zoomed} />
          <MoleculeCloud shape={N2O4_SHAPE} material={n2o4} count={() => ((1 - no2Share()) * NITROGENS) / 2} radius={R * 0.85} height={SHOULDER} size={0.011} speed={0.4} max={NITROGENS / 2} visible={zoomed} />
        </group>
      )}
    </group>
  );
}
