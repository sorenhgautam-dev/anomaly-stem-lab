"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, SphereGeometry, type InstancedMesh } from "three";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { kitMaterial, ownMaterial } from "../../materials";
import type { Getter } from "../glass";

/*
 * "Zoom to particles" for dissolving (DESIGN.md §8.1 step 6): water
 * molecules (deep teal, Chemistry's wall colour) jiggle through the beaker, and sugar molecules (white)
 * leave their heap on the bottom one by one as the sugar dissolves, then
 * spread out among the water. Every sugar molecule stays in the beaker, which
 * is why the scale doesn't change. Two instanced meshes, stepped in a class.
 */

const DOT = new SphereGeometry(1, 10, 8);
const tmp = new Object3D();
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** A random point in the unit cylinder (radius 1, height 0..1). */
function inCylinder(out: Float32Array, o: number) {
  const r = Math.sqrt(Math.random());
  const a = Math.random() * Math.PI * 2;
  out[o] = Math.cos(a) * r;
  out[o + 1] = Math.random();
  out[o + 2] = Math.sin(a) * r;
}

/** Positions live in unit-cylinder space (radius 1, height 1) and are scaled when drawn. */
class Mix {
  readonly water: Float32Array;
  readonly wet: Float32Array;
  readonly heap: Float32Array;
  readonly free: Float32Array;
  readonly vel: Float32Array;
  show = 0;
  constructor(
    readonly nWater: number,
    readonly nSugar: number,
  ) {
    const n = nWater + nSugar;
    this.water = new Float32Array(nWater * 3);
    this.wet = new Float32Array(nSugar * 3);
    this.heap = new Float32Array(nSugar * 3);
    this.free = new Float32Array(nSugar * 3);
    this.vel = new Float32Array(n * 3).map(() => rand(-1, 1));
    for (let i = 0; i < nWater; i++) inCylinder(this.water, i * 3);
    for (let i = 0; i < nSugar; i++) {
      inCylinder(this.free, i * 3);
      // The heap: a low cone on the bottom, in the middle.
      const y = Math.random() ** 1.6;
      const r = Math.sqrt(Math.random()) * (1 - y) * 0.42;
      const a = Math.random() * Math.PI * 2;
      this.heap.set([Math.cos(a) * r, y * 0.22, Math.sin(a) * r], i * 3);
    }
  }

  /** A slow random walk inside the unit cylinder (molecules in a liquid are crowded and jostle). */
  private walk(p: Float32Array, o: number, v: number, dt: number) {
    for (let a = 0; a < 3; a++) {
      this.vel[v + a] += rand(-6, 6) * dt;
      this.vel[v + a] *= 0.97;
      p[o + a] += this.vel[v + a] * 0.35 * dt;
    }
    const r = Math.hypot(p[o], p[o + 2]);
    if (r > 1) {
      p[o] /= r;
      p[o + 2] /= r;
      this.vel[v] *= -1;
      this.vel[v + 2] *= -1;
    }
    if (p[o + 1] < 0 || p[o + 1] > 1) {
      p[o + 1] = Math.min(1, Math.max(0, p[o + 1]));
      this.vel[v + 1] *= -1;
    }
  }

  step(waterMesh: InstancedMesh, sugarMesh: InstancedMesh, o: { on: boolean; radius: number; depth: number; sugar: number; dissolved: number; spread: number; dt: number }) {
    this.show += ((o.on ? 1 : 0) - this.show) * Math.min(1, o.dt * 6);
    waterMesh.visible = sugarMesh.visible = this.show > 0.02;
    if (!waterMesh.visible) return;
    const s = this.show;
    for (let i = 0; i < this.nWater; i++) {
      this.walk(this.water, i * 3, i * 3, o.dt);
      tmp.position.set(this.water[i * 3] * o.radius, this.water[i * 3 + 1] * o.depth, this.water[i * 3 + 2] * o.radius);
      tmp.scale.setScalar(0.015 * s);
      tmp.updateMatrix();
      waterMesh.setMatrixAt(i, tmp.matrix);
    }
    const n = Math.min(this.nSugar, Math.round(o.sugar));
    sugarMesh.count = n;
    // Molecule i leaves the heap once that much of the sugar has dissolved; free ones fill more of the water as it spreads.
    const reach = 0.3 + 0.7 * o.spread;
    for (let i = 0; i < n; i++) {
      this.walk(this.free, i * 3, (this.nWater + i) * 3, o.dt);
      const k = Math.min(1, Math.max(0, o.dissolved * n - i));
      const e = k * k * (3 - 2 * k);
      const h = i * 3;
      const x = this.heap[h] + (this.free[h] * reach - this.heap[h]) * e;
      const y = this.heap[h + 1] + (this.free[h + 1] * reach - this.heap[h + 1]) * e;
      const z = this.heap[h + 2] + (this.free[h + 2] * reach - this.heap[h + 2]) * e;
      tmp.position.set(x * o.radius, y * o.depth, z * o.radius);
      tmp.scale.setScalar(0.024 * s);
      tmp.updateMatrix();
      sugarMesh.setMatrixAt(i, tmp.matrix);
    }
    waterMesh.instanceMatrix.needsUpdate = true;
    sugarMesh.instanceMatrix.needsUpdate = true;
  }
}

export function DissolvingMolecules({ on, radius, depth, sugar, dissolved, spread, position }: { on: boolean; radius: number; depth: Getter<number>; sugar: Getter<number>; dissolved: Getter<number>; spread: Getter<number>; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const [mix] = useState(() => new Mix(tier === "low" ? 60 : 150, 64));
  const water = useRef<InstancedMesh>(null);
  const sugarMesh = useRef<InstancedMesh>(null);
  const waterMaterial = useMemo(() => ownMaterial(LAB.chemistry.wall, tier), [tier]);
  useEffect(() => () => waterMaterial.dispose(), [waterMaterial]);
  useFrame((_, delta) => {
    if (water.current && sugarMesh.current) mix.step(water.current, sugarMesh.current, { on, radius, depth: depth(), sugar: sugar(), dissolved: dissolved(), spread: spread(), dt: Math.min(delta, 1 / 30) });
  });
  return (
    <group position={position}>
      <instancedMesh ref={water} args={[DOT, waterMaterial, mix.nWater]} frustumCulled={false} />
      <instancedMesh ref={sugarMesh} args={[DOT, kitMaterial("plastic", tier), mix.nSugar]} frustumCulled={false} />
    </group>
  );
}
