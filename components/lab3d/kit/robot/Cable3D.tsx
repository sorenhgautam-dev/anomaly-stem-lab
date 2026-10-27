"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, Object3D, SphereGeometry, TubeGeometry, Vector3, type InstancedMesh } from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { kitMaterial } from "../materials";
import type { Getter } from "../chem/glass";
import { neonMaterial } from "./looks";

/*
 * A cable between bench devices (DESIGN.md §7.5 "wire: smooth tube along a
 * curve, current shown as moving particles"): a glossy tube through world
 * points, and glowing dots that run along it at `flow` units per second
 * (0 hides them), like the board wires of the circuit kit.
 */

const DOT = new SphereGeometry(0.02, 10, 8);
const SPACING = 0.12;
const o = new Object3D();

export function Cable3D({ points, flow, color = "ink", radius = 0.014 }: { points: [number, number, number][]; flow?: Getter<number>; color?: "ink" | "orange" | "rubber"; radius?: number }) {
  const tier = useQuality((s) => s.level);
  const dots = useRef<InstancedMesh>(null);
  const key = JSON.stringify(points);
  const { curve, tube, length, count } = useMemo(() => {
    const c = new CatmullRomCurve3(
      (JSON.parse(key) as [number, number, number][]).map((p) => new Vector3(...p)),
      false,
      "centripetal",
    );
    const l = c.getLength();
    return { curve: c, tube: new TubeGeometry(c, Math.max(20, Math.round(l * 40)), radius, 8, false), length: l, count: Math.max(2, Math.floor(l / SPACING)) };
  }, [key, radius]);
  const motion = useRef({ offset: 0 });
  useEffect(() => () => tube.dispose(), [tube]);

  useFrame((_, delta) => {
    const mesh = dots.current;
    if (!mesh || !flow) return;
    const speed = flow();
    mesh.visible = speed > 0.001;
    if (!mesh.visible) return;
    motion.current.offset += speed * Math.min(delta, 1 / 30);
    for (let i = 0; i < count; i++) {
      const u = (((i * SPACING + motion.current.offset) % length) + length) % length;
      curve.getPointAt(u / length, o.position);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={tube} material={kitMaterial(color, tier)} />
      {flow && <instancedMesh ref={dots} args={[DOT, neonMaterial(P.apricot[400]), count]} frustumCulled={false} visible={false} />}
    </group>
  );
}
