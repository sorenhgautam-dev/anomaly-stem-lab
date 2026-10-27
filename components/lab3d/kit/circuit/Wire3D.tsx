"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry, TubeGeometry } from "three";
import type { Pt } from "./board-geometry";
import { playback } from "@/components/lab/playback";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { kitMaterial } from "../materials";
import { jumperCurve, wireCurve } from "./space";

/*
 * A wire on the board (DESIGN.md §7.5): a glossy tube along the board's
 * route, and once powered, glowing current particles flowing along it at a
 * speed set by the simulator's real current (more amps, faster), in the
 * direction it flows. Wires the student added are orange jumpers.
 */

const DOT = new SphereGeometry(0.024, 10, 8);
const SPACING = 0.15;
const o = new Object3D();

let dotMaterial: MeshStandardMaterial | null = null;
function currentMaterial() {
  dotMaterial ??= new MeshStandardMaterial({ color: P.apricot[300], emissive: P.apricot[500], emissiveIntensity: 1.6, roughness: 0.3 });
  return dotMaterial;
}

/** Visual speed for a current: monotonic, readable from 1 mA to a short circuit. */
export function flowSpeed(amps: number): number {
  return 0.22 + 2.1 * Math.min(1, Math.sqrt(Math.abs(amps) / 0.06));
}

export function Wire3D({ points, added, amps, powered }: { points: Pt[]; added: boolean; amps: number; powered: boolean }) {
  const tier = useQuality((s) => s.level);
  const curve = useMemo(() => (added ? jumperCurve(points) : wireCurve(points)), [points, added]);
  const tube = useMemo(() => new TubeGeometry(curve, Math.max(24, Math.round(curve.getLength() * 40)), 0.024, 10, false), [curve]);
  const length = curve.getLength();
  const count = Math.max(2, Math.floor(length / SPACING));
  const dots = useRef<InstancedMesh>(null);
  const motion = useRef({ offset: 0 });
  const live = powered && Math.abs(amps) > 0.0005;
  useEffect(() => () => tube.dispose(), [tube]);

  useFrame((_, delta) => {
    const mesh = dots.current;
    if (!mesh || !live) return;
    // Power ramps up over the first second of the run.
    const k = Math.min(1, playback.t / 0.9);
    const ramp = k * k * (3 - 2 * k);
    motion.current.offset += Math.sign(amps) * flowSpeed(amps) * ramp * Math.min(delta, 1 / 30);
    for (let i = 0; i < count; i++) {
      const u = (((i * SPACING + motion.current.offset) % length) + length) % length;
      curve.getPointAt(u / length, o.position);
      o.scale.setScalar(ramp);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={tube} material={kitMaterial(added ? "orange" : "ink", tier)} />
      {live && <instancedMesh ref={dots} args={[DOT, currentMaterial(), count]} frustumCulled={false} />}
    </group>
  );
}
