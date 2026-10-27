"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, type Group, type InstancedMesh } from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import type { Getter } from "../glass";
import { Readout } from "../instruments";
import { kitMaterial, ownMaterial } from "../../materials";

/*
 * A round pressure gauge (DESIGN.md §8 "toy-like rounded instruments with
 * small screens in Geist Mono"): a white body, a cream dial with ticks every
 * 50 kPa over a 270° sweep, an ink needle following the simulator's kPa and
 * a small screen with the number. After a wrong run a translucent volt needle
 * points where the student expected it. It faces +z.
 */

const SWEEP = (Math.PI * 3) / 2;
const tmp = new Object3D();

/** Needle angle (radians about z, 0 = straight up) for a pressure. */
const angle = (kpa: number, max: number) => SWEEP / 2 - Math.max(0, Math.min(1, kpa / max)) * SWEEP;

export function PressureGauge3D({ kpa, ghost, max = 450, radius = 0.24, position }: { kpa: Getter<number>; ghost: number | null; max?: number; radius?: number; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const needle = useRef<Group>(null);
  const ticks = useRef<InstancedMesh>(null);
  const ghostMaterial = useMemo(() => ownMaterial(P.volt[500], tier, { transparent: true, opacity: 0.55 }), [tier]);
  const steps = Math.floor(max / 50);

  useLayoutEffect(() => {
    const m = ticks.current;
    if (!m) return;
    for (let i = 0; i <= steps; i++) {
      const a = angle(i * 50, max);
      const r = radius * 0.78;
      tmp.position.set(-Math.sin(a) * r, Math.cos(a) * r, 0.046);
      tmp.rotation.set(0, 0, a);
      tmp.scale.set(0.012, i % 2 === 0 ? 0.05 : 0.03, 0.006);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  useFrame(() => {
    if (needle.current) needle.current.rotation.z = angle(kpa(), max);
  });

  const hand = (material: ReturnType<typeof kitMaterial>, z: number, width: number) => (
    <mesh position={[0, radius * 0.32, z]} material={material}>
      <boxGeometry args={[width, radius * 0.72, 0.008]} />
    </mesh>
  );

  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={kitMaterial("plastic", tier)}>
        <cylinderGeometry args={[radius, radius, 0.08, 40]} />
      </mesh>
      <mesh position={[0, 0, 0.041]} material={kitMaterial("board", tier)}>
        <circleGeometry args={[radius * 0.9, 40]} />
      </mesh>
      <instancedMesh ref={ticks} args={[undefined, kitMaterial("ink", tier), steps + 1]}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      {ghost !== null && <group rotation={[0, 0, angle(ghost, max)]}>{hand(ghostMaterial, 0.05, 0.03)}</group>}
      <group ref={needle}>{hand(kitMaterial("ink", tier), 0.056, 0.016)}</group>
      <mesh position={[0, 0, 0.062]} rotation={[Math.PI / 2, 0, 0]} material={kitMaterial("orange", tier)}>
        <cylinderGeometry args={[0.025, 0.025, 0.014, 16]} />
      </mesh>
      {/* Fixed width, so the screen's board keeps one size as the reading changes. */}
      <Readout text={() => `${kpa().toFixed(1).padStart(5)} kPa`} style="screen" height={0.09} position={[0, -radius * 0.45, 0.07]} />
    </group>
  );
}
