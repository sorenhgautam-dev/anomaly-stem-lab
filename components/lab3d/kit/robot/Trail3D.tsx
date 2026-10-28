"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CatmullRomCurve3, Object3D, TubeGeometry, Vector3, type InstancedMesh, type Mesh } from "three";
import type { Point } from "@/engine/types";
import { LAB } from "@/lib/tokens";
import type { Getter } from "../chem/glass";
import { ghostMarkMaterial, neonMaterial } from "./looks";
import { arenaToWorld } from "./space";

/*
 * Robot trails on the arena mat (CLAUDE.md §6.4 "show it as a ghost trail
 * beside the real trail"): reality is a glowing gold tape, the ghost of
 * the believed path is a row of teal dashes (shape and opacity, not only
 * colour). Both are built once per path and revealed with the clock
 * (`reveal`, 0–1): the tape by draw range, the dashes by instance count.
 */

const RADIAL = 6;
const DASH = new BoxGeometry(0.026, 0.006, 0.032);
const DASH_GAP = 0.06;
const o = new Object3D();
const ahead = new Vector3();

function curveOf(points: Point[] | null, lift: number): CatmullRomCurve3 | null {
  if (!points || points.length < 2) return null;
  const world = points.map((p) => arenaToWorld(p, new Vector3(), lift));
  const curve = new CatmullRomCurve3(world, false, "centripetal");
  return curve.getLength() > 0.01 ? curve : null;
}

/** The real trail: a neon tape along the path, drawn up to `reveal`. */
export function Trail3D({ points, reveal }: { points: Point[] | null; reveal: Getter<number> }) {
  const mesh = useRef<Mesh>(null);
  const tube = useMemo(() => {
    const curve = curveOf(points, 0.006);
    if (!curve) return null;
    const segments = Math.max(16, Math.round(curve.getLength() * 90));
    return { geometry: new TubeGeometry(curve, segments, 0.014, RADIAL, false), segments };
  }, [points]);
  useEffect(() => () => tube?.geometry.dispose(), [tube]);
  useFrame(() => {
    const m = mesh.current;
    if (!m || !tube) return;
    const k = Math.min(1, Math.max(0, reveal()));
    m.geometry.setDrawRange(0, Math.floor(k * tube.segments) * RADIAL * 6);
    m.visible = k > 0.001;
  });
  if (!tube) return null;
  return <mesh ref={mesh} geometry={tube.geometry} material={neonMaterial(LAB.robotics.gold)} frustumCulled={false} />;
}

/** The ghost trail: teal dashes along the believed path, appearing up to `reveal`. */
export function GhostTrail3D({ points, reveal }: { points: Point[] | null; reveal: Getter<number> }) {
  const mesh = useRef<InstancedMesh>(null);
  const curve = useMemo(() => curveOf(points, 0.008), [points]);
  const count = curve ? Math.max(2, Math.floor(curve.getLength() / DASH_GAP)) : 0;
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m || !curve) return;
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count;
      curve.getPointAt(u, o.position);
      curve.getPointAt(Math.min(1, u + 0.002), ahead);
      if (ahead.distanceToSquared(o.position) < 1e-10) ahead.z -= 0.01;
      o.lookAt(ahead);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [curve, count]);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    m.count = Math.round(Math.min(1, Math.max(0, reveal())) * count);
  });
  if (!curve) return null;
  return <instancedMesh key={count} ref={mesh} args={[DASH, ghostMarkMaterial(), count]} frustumCulled={false} />;
}
