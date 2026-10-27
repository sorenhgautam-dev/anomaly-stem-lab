"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, SphereGeometry, type BufferGeometry, type InstancedMesh, type Material } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Getter } from "../glass";

/*
 * Molecules for "zoom to particles" (DESIGN.md §8.1 step 6) in the reaction
 * stages: small ball models built from spheres (O₂ pairs, bent NO₂, N₂O₄
 * made of two NO₂ joined) that drift, tumble and bounce inside a cylinder
 * (a jar or a sealed tube). One instanced mesh per kind of molecule.
 */

function atoms(list: [number, number, number, number][]): BufferGeometry {
  return mergeGeometries(list.map(([x, y, z, r]) => new SphereGeometry(r, 12, 8).translate(x, y, z)));
}

/** O=O: two atoms side by side. */
export const O2_SHAPE = atoms([
  [-0.55, 0, 0, 0.75],
  [0.55, 0, 0, 0.75],
]);

/** NO₂: a nitrogen with two oxygens bent at about 134°. */
export const NO2_SHAPE = atoms([
  [0, 0.22, 0, 0.7],
  [-0.8, -0.18, 0, 0.62],
  [0.8, -0.18, 0, 0.62],
]);

/** N₂O₄: two NO₂ joined nitrogen to nitrogen. */
export const N2O4_SHAPE = atoms([
  [-0.5, 0, 0, 0.68],
  [0.5, 0, 0, 0.68],
  [-1.05, 0.7, 0, 0.58],
  [-1.05, -0.7, 0, 0.58],
  [1.05, 0.7, 0, 0.58],
  [1.05, -0.7, 0, 0.58],
]);

const tmp = new Object3D();

/** Positions, velocities and tumbling for up to `max` molecules (mutated only through step()). */
class Swarm {
  private pos: Float32Array;
  private vel: Float32Array;
  private rot: Float32Array;
  private spin: Float32Array;
  constructor(readonly max: number) {
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.rot = new Float32Array(max * 3);
    this.spin = new Float32Array(max * 3);
    for (let i = 0; i < max; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 0.8;
      this.pos.set([Math.cos(a) * r, Math.random(), Math.sin(a) * r], i * 3);
      for (let k = 0; k < 3; k++) {
        this.vel[i * 3 + k] = (Math.random() - 0.5) * 2;
        this.rot[i * 3 + k] = Math.random() * Math.PI * 2;
        this.spin[i * 3 + k] = (Math.random() - 0.5) * 4;
      }
    }
  }

  /** Move and draw `n` molecules inside a cylinder of `radius` from y = 0 to `height` (positions kept as fractions). */
  step(mesh: InstancedMesh, n: number, radius: number, height: number, size: number, speed: number, dt: number) {
    mesh.count = n;
    const p = this.pos;
    const v = this.vel;
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      p[o] += (v[o] * speed * dt * 0.35) / Math.max(radius, 0.05);
      p[o + 1] += (v[o + 1] * speed * dt * 0.35) / Math.max(height, 0.05);
      p[o + 2] += (v[o + 2] * speed * dt * 0.35) / Math.max(radius, 0.05);
      const rr = p[o] * p[o] + p[o + 2] * p[o + 2];
      if (rr > 1) {
        // Reflect off the round wall: flip the outward part of the velocity.
        const len = Math.sqrt(rr);
        const nx = p[o] / len;
        const nz = p[o + 2] / len;
        const out = v[o] * nx + v[o + 2] * nz;
        if (out > 0) {
          v[o] -= 2 * out * nx;
          v[o + 2] -= 2 * out * nz;
        }
        p[o] = nx * 0.999;
        p[o + 2] = nz * 0.999;
      }
      if (p[o + 1] < 0 || p[o + 1] > 1) {
        p[o + 1] = p[o + 1] < 0 ? 0 : 1;
        v[o + 1] *= -1;
      }
      for (let k = 0; k < 3; k++) this.rot[o + k] += this.spin[o + k] * speed * dt;
      tmp.position.set(p[o] * radius, p[o + 1] * height, p[o + 2] * radius);
      tmp.rotation.set(this.rot[o], this.rot[o + 1], this.rot[o + 2]);
      tmp.scale.setScalar(size);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
}

/** A cloud of one kind of molecule; `count` is a getter (read every frame). Hidden when `visible` is false. */
export function MoleculeCloud({ shape, material, count, radius, height, size = 0.02, speed = 1, max = 60, visible = true, position }: { shape: BufferGeometry; material: Material; count: Getter<number>; radius: number; height: number; size?: number; speed?: number; max?: number; visible?: boolean; position?: [number, number, number] }) {
  const mesh = useRef<InstancedMesh>(null);
  const [swarm] = useState(() => new Swarm(max));
  useFrame((_, delta) => {
    if (!mesh.current || !visible) return;
    swarm.step(mesh.current, Math.max(0, Math.min(max, Math.round(count()))), radius - size, height - size, size, speed, Math.min(delta, 1 / 30));
  });
  return <instancedMesh ref={mesh} args={[shape, material, max]} position={position} visible={visible} frustumCulled={false} />;
}
