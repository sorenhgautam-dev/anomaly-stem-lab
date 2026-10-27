"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CylinderGeometry, Object3D, type Group, type InstancedMesh } from "three";
import { useQuality } from "@/lib/quality";
import type { Getter } from "../glass";
import { Readout } from "../instruments";
import { kitMaterial } from "../../materials";

/*
 * A sealed syringe lying along x (DESIGN.md §7.5 kit, toy-like): a glass
 * barrel marked every 10 mL, finger grips, a rubber-tipped plunger with an
 * orange thumb pad, and a nozzle at the sealed end. The group's origin is
 * the sealed end; the barrel runs towards -x and the plunger sits `volume`
 * mL from the end, with a small label riding on it.
 */

/** Barrel length per mL. */
export const ML = 0.01;
const MAX_ML = 75;
const LENGTH = MAX_ML * ML;
const ROD = 0.66;
const tmp = new Object3D();

const along = (g: CylinderGeometry) => g.rotateZ(Math.PI / 2);
const BARREL = along(new CylinderGeometry(1, 1, LENGTH, 36, 1, true)).translate(-LENGTH / 2, 0, 0);
const DISC = along(new CylinderGeometry(1, 1, 1, 32));
const NOZZLE = along(new CylinderGeometry(0.02, 0.04, 0.07, 16)).translate(0.035, 0, 0);

export function Syringe3D({ volume, radius = 0.14 }: { volume: Getter<number>; radius?: number }) {
  const tier = useQuality((s) => s.level);
  const plunger = useRef<Group>(null);
  const ticks = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = ticks.current;
    if (!m) return;
    for (let i = 0; i < 7; i++) {
      tmp.position.set(-(i + 1) * 10 * ML, radius * 0.45, radius * 0.9);
      tmp.rotation.set(-0.47, 0, 0);
      tmp.scale.set(0.006, i % 2 === 1 ? 0.07 : 0.045, 0.004);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  useFrame(() => {
    if (plunger.current) plunger.current.position.x = -Math.max(0, Math.min(MAX_ML, volume())) * ML;
  });

  return (
    <group>
      <mesh geometry={BARREL} scale={[1, radius, radius]} material={kitMaterial("glass", tier)} />
      <mesh geometry={DISC} position={[-0.01, 0, 0]} scale={[0.02, radius, radius]} material={kitMaterial("glass", tier)} />
      <mesh geometry={NOZZLE} material={kitMaterial("glass", tier)} />
      <instancedMesh ref={ticks} args={[undefined, kitMaterial("ink", tier), 7]}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <RoundedBox args={[0.03, radius * 3.1, radius * 1.7]} radius={0.012} smoothness={3} position={[-LENGTH, 0, 0]} material={kitMaterial("plastic", tier)} />
      <group ref={plunger}>
        <mesh geometry={DISC} position={[-0.025, 0, 0]} scale={[0.05, radius * 0.97, radius * 0.97]} material={kitMaterial("rubber", tier)} />
        <mesh geometry={DISC} position={[-0.05 - ROD / 2, 0, 0]} scale={[ROD, 0.028, 0.028]} material={kitMaterial("plastic", tier)} />
        <mesh geometry={DISC} position={[-0.05 - ROD, 0, 0]} scale={[0.03, 0.12, 0.12]} material={kitMaterial("orange", tier)} />
        {/* Fixed width, so the label's board keeps one size as it counts. */}
        <Readout text={() => `${Math.round(volume()).toString().padStart(2)} mL`} height={0.085} position={[-0.02, radius + 0.11, 0]} />
      </group>
    </group>
  );
}
