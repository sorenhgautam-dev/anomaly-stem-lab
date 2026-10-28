"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, InstancedMesh, MeshStandardMaterial, Object3D, Quaternion, SphereGeometry, TubeGeometry, Vector3 } from "three";
import type { Pt } from "./board-geometry";
import { playback } from "@/components/lab/playback";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { kitMaterial } from "../materials";
import { jumperCurve, wireCurve } from "./space";

/*
 * A wire on the board (DESIGN.md §7.5, §8.2): satin graphite insulation
 * along the board's route with bare copper ends where it meets a terminal,
 * and once powered, glowing current particles (Robotics' teal) flowing along
 * it at a speed set by the simulator's real current (more amps, faster), in
 * the direction it flows. Wires the student added are gold jumpers.
 */

const DOT = new SphereGeometry(0.022, 10, 8);
const END = new CylinderGeometry(0.011, 0.011, 0.03, 10);
const UP = new Vector3(0, 1, 0);
const SPACING = 0.15;
const o = new Object3D();

let dotMaterial: MeshStandardMaterial | null = null;
function currentMaterial() {
  dotMaterial ??= new MeshStandardMaterial({ color: LAB.robotics.teal, emissive: LAB.robotics.teal, emissiveIntensity: 1.4, roughness: 0.3 });
  return dotMaterial;
}

/** Visual speed for a current: monotonic, readable from 1 mA to a short circuit. */
export function flowSpeed(amps: number): number {
  return 0.22 + 2.1 * Math.min(1, Math.sqrt(Math.abs(amps) / 0.06));
}

export function Wire3D({ points, added, amps, powered }: { points: Pt[]; added: boolean; amps: number; powered: boolean }) {
  const tier = useQuality((s) => s.level);
  const curve = useMemo(() => (added ? jumperCurve(points) : wireCurve(points)), [points, added]);
  const tube = useMemo(() => new TubeGeometry(curve, Math.max(24, Math.round(curve.getLength() * 48)), 0.02, 12, false), [curve]);
  // Bare copper at each end, along the wire's direction there.
  const ends = useMemo(
    () =>
      ([0, 1] as const).map((t) => {
        const at = curve.getPointAt(t);
        const dir = curve.getTangentAt(t).multiplyScalar(t === 0 ? -1 : 1);
        return { at: at.add(dir.clone().multiplyScalar(0.012)), turn: new Quaternion().setFromUnitVectors(UP, dir.normalize()) };
      }),
    [curve],
  );
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
      <mesh geometry={tube} material={kitMaterial(added ? "gold" : "insulation", tier)} />
      {ends.map((e, i) => (
        <mesh key={i} geometry={END} position={e.at} quaternion={e.turn} material={kitMaterial("copper", tier)} />
      ))}
      {live && <instancedMesh ref={dots} args={[DOT, currentMaterial(), count]} frustumCulled={false} />}
    </group>
  );
}
