"use client";

import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import { useQuality } from "@/lib/quality";
import type { Getter } from "../glass";
import { Readout } from "../instruments";
import { kitMaterial } from "../../materials";

/*
 * A toy pH meter (DESIGN.md §8 "toy-like rounded instruments with small
 * screens in Geist Mono"): a rounded white body with a dark screen reading
 * the simulator's pH, and a probe on a cable dipped into the liquid. `probe`
 * is the probe's top, relative to the meter; it hangs `depth` straight down.
 */

export function PhMeter3D({ ph, probe, depth, position }: { ph: Getter<number>; probe: [number, number, number]; depth: number; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const [px, py, pz] = probe;
  const cable = useMemo(() => {
    // A thin cable from the back of the meter, sagging a little on its way up to the probe.
    const curve = new CatmullRomCurve3([new Vector3(0, 0.22, -0.07), new Vector3(px * 0.35, 0.3, pz - 0.08), new Vector3(px * 0.8, py + 0.06, pz - 0.02), new Vector3(px, py, pz)]);
    return new TubeGeometry(curve, 40, 0.007, 6, false);
  }, [px, py, pz]);
  return (
    <group position={position}>
      <group rotation={[-0.18, 0, 0]}>
        <RoundedBox args={[0.36, 0.26, 0.12]} radius={0.05} smoothness={4} position={[0, 0.13, 0]} material={kitMaterial("plastic", tier)} />
        <mesh position={[0.12, 0.27, 0]} material={kitMaterial("orange", tier)}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
        </mesh>
        {/* Fixed width, so the screen's board keeps one size as the reading changes. */}
        <Readout text={() => `pH ${ph().toFixed(2).padStart(5)}`} style="screen" height={0.1} position={[0, 0.13, 0.11]} />
      </group>
      <mesh geometry={cable} material={kitMaterial("plastic", tier)} />
      <mesh position={[px, py - depth / 2, pz]} material={kitMaterial("plastic", tier)}>
        <cylinderGeometry args={[0.013, 0.013, depth, 12]} />
      </mesh>
      <mesh position={[px, py - depth, pz]} material={kitMaterial("ink", tier)}>
        <sphereGeometry args={[0.02, 12, 8]} />
      </mesh>
    </group>
  );
}
