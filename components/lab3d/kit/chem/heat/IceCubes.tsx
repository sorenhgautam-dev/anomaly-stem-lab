"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, type InstancedMesh, type MeshStandardMaterial } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality } from "@/lib/quality";
import { ownMaterial } from "../../materials";
import type { Getter } from "../glass";
import { TONE } from "./tones";

/*
 * Ice cubes (DESIGN.md §7.5 kit, faked glassy ice): one instanced mesh of
 * rounded, pale translucent cubes (white with a breath of sage). Each shrinks with `left` (the share of ice
 * still solid, by volume) and floats once the water surface `top` reaches
 * it. `fade` (0..1) thins them out for the particle view.
 */

const CUBE = new RoundedBoxGeometry(1, 1, 1, 3, 0.2);
const tmp = new Object3D();

/** One cube: x, resting y (its bottom), z, edge length, turn about y. */
export type Cube = [number, number, number, number, number];

export function IceCubes({ cubes, left, top, fade, position }: { cubes: readonly Cube[]; left: Getter<number>; top: Getter<number>; fade?: Getter<number>; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const mesh = useRef<InstancedMesh>(null);
  const material = useMemo(() => ownMaterial(TONE.ice, tier, { transparent: true, opacity: 0.78 }), [tier]);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const k = Math.cbrt(Math.max(0, Math.min(1, left())));
    const water = top();
    const time = clock.elapsedTime;
    for (let i = 0; i < cubes.length; i++) {
      const [x, y, z, edge, turn] = cubes[i];
      const s = edge * k;
      // Rest on the pile until the water lifts it; then bob a little.
      const float = water - s * 0.6;
      const lift = float > y ? float + Math.sin(time * 1.3 + i * 1.7) * 0.004 : y;
      tmp.position.set(x * (0.6 + 0.4 * k), lift + s / 2, z * (0.6 + 0.4 * k));
      tmp.rotation.set(Math.sin(i * 2.3) * 0.3, turn, Math.cos(i * 1.9) * 0.25);
      tmp.scale.setScalar(s > 0.004 ? s : 0);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    const mat = m.material as MeshStandardMaterial;
    mat.opacity = 0.78 * (fade ? fade() : 1);
    m.visible = mat.opacity > 0.02 && k > 0.02;
  });
  return <instancedMesh ref={mesh} args={[CUBE, undefined, cubes.length]} material={material} position={position} frustumCulled={false} />;
}
