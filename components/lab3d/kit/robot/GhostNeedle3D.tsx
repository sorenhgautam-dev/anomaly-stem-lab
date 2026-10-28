"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, ConeGeometry, type Group } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Getter } from "../chem/glass";
import { ghostMarkMaterial } from "./looks";

/*
 * The ghost of a believed spin (DESIGN.md §8.1 ghost beside reality): a
 * dashed teal needle on the same axle as the real part, turning at the
 * speed the student's belief predicts, so the two speeds race side by side.
 * Dashes and a triangular tip, so it reads by shape as well as colour.
 * `angle` is in radians, + = counter-clockwise seen from the front (+Z).
 */

export function GhostNeedle3D({ length, angle, position }: { length: number; angle: Getter<number>; position?: [number, number, number] }) {
  const spin = useRef<Group>(null);
  const geometry = useMemo(() => {
    const dash = length / 5;
    const parts = [0, 1, 2, 3].map((i) => new BoxGeometry(dash * 0.62, 0.022, 0.012).translate(dash * (i + 0.5), 0, 0));
    const tip = new ConeGeometry(0.03, dash * 0.9, 3).rotateZ(-Math.PI / 2).translate(dash * 4.45, 0, 0);
    const merged = mergeGeometries([...parts.map((p) => p.toNonIndexed()), tip.toNonIndexed()]);
    [...parts, tip].forEach((g) => g.dispose());
    return merged;
  }, [length]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (spin.current) spin.current.rotation.z = angle();
  });
  return (
    <group ref={spin} position={position}>
      <mesh geometry={geometry} material={ghostMarkMaterial()} renderOrder={5} />
    </group>
  );
}
