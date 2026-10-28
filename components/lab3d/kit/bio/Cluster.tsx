"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { IcosahedronGeometry, InstancedMesh, Object3D, Vector3 } from "three";
import { useQuality } from "@/lib/quality";
import type { Getter } from "../chem/glass";
import { cellMaterials, hash01 } from "./cell-material";

/*
 * A cluster of cells that grows by doubling (Detection Lab, DESIGN.md §8):
 * soft, clean spheres packed into a ball, never red or realistic tissue.
 * Up to MAX cells are drawn one by one from the middle out; past that the
 * whole ball swells with the cube root of the count, so a cluster of 30,000
 * still reads as one calm lump. One instanced mesh.
 */

const MAX = 260;
/** Scratch object for placing instances each frame. */
const o = new Object3D();
/** The most a cluster swells past MAX cells (so 260,000 cells still fit the scanner ring). */
const SWELL_MAX = 2.4;

/** Points filling a ball from the centre out (a Fibonacci spiral on growing shells). */
function ballSpots(n: number): Vector3[] {
  const out: Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const r = Math.cbrt((i + 0.5) / n);
    const y = 1 - (2 * ((i * 7) % n + 0.5)) / n;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    out.push(new Vector3(Math.cos(i * golden) * ring * r, y * r, Math.sin(i * golden) * ring * r));
  }
  return out;
}

export function Cluster({ count, color, radius = 0.16, opacity = 1, position }: { count: Getter<number>; color: string; radius?: number; opacity?: number; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const skin = useRef<InstancedMesh>(null);
  const core = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new IcosahedronGeometry(1, tier === "low" ? 2 : 3), [tier]);
  const coreGeometry = useMemo(() => new IcosahedronGeometry(1, 1), []);
  const mats = useMemo(() => cellMaterials(color, tier, { see: opacity }), [color, tier, opacity]);
  const spots = useMemo(() => ballSpots(MAX), []);
  const shown = useRef<number[]>(new Array(MAX).fill(0));
  useEffect(
    () => () => {
      geometry.dispose();
      coreGeometry.dispose();
      mats.membrane.dispose();
      mats.nucleus.dispose();
    },
    [geometry, coreGeometry, mats],
  );
  useFrame((state, delta) => {
    const m = skin.current;
    const c = core.current;
    if (!m || !c) return;
    mats.tick(state.clock.elapsedTime);
    const n = Math.max(0, count());
    const drawn = Math.min(MAX, n);
    // Past MAX cells the ball swells instead: cube root, like a real ball's size with its volume, capped so it stays a calm lump in its frame.
    const swell = n > MAX ? Math.min(SWELL_MAX, Math.cbrt(n / MAX)) : 1;
    const cell = (radius / Math.cbrt(MAX)) * 1.35 * swell;
    const k = Math.min(1, delta * 6);
    for (let i = 0; i < MAX; i++) {
      const want = i < Math.floor(drawn) ? 1 : i < drawn ? drawn - Math.floor(drawn) : 0;
      shown.current[i] += (want - shown.current[i]) * k;
      const p = spots[i];
      o.position.set(p.x * radius * swell, p.y * radius * swell, p.z * radius * swell);
      o.scale.setScalar(cell * shown.current[i] * (0.85 + hash01(i) * 0.3));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      o.scale.multiplyScalar(0.42);
      o.updateMatrix();
      c.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    c.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={position}>
      <instancedMesh ref={core} args={[coreGeometry, mats.nucleus, MAX]} frustumCulled={false} />
      <instancedMesh ref={skin} args={[geometry, mats.membrane, MAX]} frustumCulled={false} renderOrder={2} />
    </group>
  );
}
