"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry, type Group, type Mesh } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { kitMaterial } from "../materials";
import type { Getter } from "./glass";

/*
 * A zip bag (DESIGN.md §7.5 kit "sealed bag") that puffs up as gas fills it,
 * with its zip drawn closed (one volt strip) or open (a gap at the top), and
 * a cloud of gas molecules bouncing inside an ellipsoid (CO₂ here).
 */

const W = 1.15;
const H = 0.28;
const D = 0.86;
const BAG = new RoundedBoxGeometry(W, H, D, 6, 0.13).translate(0, H / 2, 0);

export function ZipBag3D({ inflate, sealed, position, children }: { inflate: Getter<number>; sealed: boolean; position?: [number, number, number]; children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  const body = useRef<Mesh>(null);
  const zip = useRef<Group>(null);
  useFrame(() => {
    const k = Math.max(0, Math.min(1, inflate()));
    const sy = 1 + k * 1.9;
    body.current?.scale.set(1 + k * 0.06, sy, 1 + k * 0.1);
    zip.current?.position.set(0, H * sy - 0.012, -D * 0.36);
  });
  return (
    <group position={position}>
      <mesh ref={body} geometry={BAG} material={kitMaterial("glass", tier)} renderOrder={2} />
      {children}
      <group ref={zip}>
        {sealed ? (
          <mesh material={kitMaterial("volt", tier)}>
            <boxGeometry args={[W * 0.94, 0.03, 0.05]} />
          </mesh>
        ) : (
          <>
            <mesh material={kitMaterial("volt", tier)} position={[0, 0.03, -0.035]} rotation={[0.5, 0, 0]}>
              <boxGeometry args={[W * 0.94, 0.025, 0.04]} />
            </mesh>
            <mesh material={kitMaterial("volt", tier)} position={[0, 0, 0.035]}>
              <boxGeometry args={[W * 0.94, 0.025, 0.04]} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

const DOT = new SphereGeometry(1, 10, 8);
const tmp = new Object3D();

/** Molecules bouncing about inside an ellipsoid; `count` and `radii` are getters. */
class Cloud {
  pos: Float32Array;
  vel: Float32Array;
  constructor(readonly max: number) {
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    for (let i = 0; i < max * 3; i++) {
      this.pos[i] = (Math.random() - 0.5) * 0.6;
      this.vel[i] = (Math.random() - 0.5) * 0.9;
    }
  }
  step(mesh: InstancedMesh, n: number, radii: [number, number, number], size: number, speed: number, dt: number) {
    mesh.count = n;
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      for (let a = 0; a < 3; a++) {
        this.pos[o + a] += this.vel[o + a] * speed * dt;
        if (Math.abs(this.pos[o + a]) > radii[a]) {
          this.pos[o + a] = Math.sign(this.pos[o + a]) * radii[a];
          this.vel[o + a] *= -1;
        }
      }
      tmp.position.set(this.pos[o], this.pos[o + 1], this.pos[o + 2]);
      tmp.scale.setScalar(size);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
}

export function GasCloud({ count, radii, size = 0.03, speed = 1, color = "#8f9bbd", max = 80, position }: { count: Getter<number>; radii: Getter<[number, number, number]>; size?: number; speed?: number; color?: string; max?: number; position?: [number, number, number] }) {
  const mesh = useRef<InstancedMesh>(null);
  const [cloud] = useState(() => new Cloud(max));
  const material = useMemo(() => new MeshStandardMaterial({ color, roughness: 0.35, emissive: P.volt[100], emissiveIntensity: 0.15 }), [color]);
  useFrame((_, delta) => {
    if (mesh.current) cloud.step(mesh.current, Math.max(0, Math.min(max, Math.round(count()))), radii(), size, speed, Math.min(delta, 1 / 30));
  });
  return <instancedMesh ref={mesh} args={[DOT, material, max]} position={position} frustumCulled={false} />;
}
