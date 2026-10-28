"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, SphereGeometry, type InstancedMesh, type Sprite, type SpriteMaterial } from "three";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { glowMaterial, kitMaterial } from "../../materials";
import { vfx } from "../../vfx";
import type { Getter } from "../glass";

/*
 * Air in a sealed syringe (DESIGN.md §8.1 "gas as particles bouncing inside
 * containers"): a fixed number of molecules flying at one speed (the
 * temperature stays the same) inside the barrel, between the sealed end and
 * the plunger. Squeeze them into less space and each one reaches the plunger
 * more often, so the hits (small sand-gold flashes, and a glow on the
 * plunger's face that follows how often it is hit) come faster: that is the
 * pressure rising. Positions are in the group's space, the barrel along x.
 */

const DOT = new SphereGeometry(1, 10, 8);
const tmp = new Object3D();

class Gas {
  readonly pos: Float32Array;
  readonly vel: Float32Array;
  /** How hard the plunger is being hit lately (decays between hits). */
  impact = 0;
  constructor(readonly n: number) {
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.acos(Math.random() * 2 - 1);
      this.vel.set([Math.sin(b) * Math.cos(a), Math.sin(b) * Math.sin(a), Math.cos(b)], i * 3);
      this.pos.set([Math.random(), (Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.16], i * 3);
    }
  }

  /** `plunger` and `end` bound the gas along x (plunger < end); `r` is the barrel's inner radius. */
  step(mesh: InstancedMesh, face: Sprite, o: { plunger: number; end: number; r: number; size: number; speed: number; dt: number; at: [number, number, number] }) {
    let flashes = 0;
    let hits = 0;
    for (let i = 0; i < this.n; i++) {
      const k = i * 3;
      const p = this.pos;
      const v = this.vel;
      // Positions along x are stored as a fraction of the space, so the gas squeezes with the plunger.
      const len = Math.max(0.02, o.end - o.plunger);
      let x = o.plunger + p[k] * len + v[k] * o.speed * o.dt;
      if (x < o.plunger + o.size) {
        x = o.plunger + o.size;
        v[k] = Math.abs(v[k]);
        hits++;
        if (flashes < 3) {
          flashes++;
          vfx.burst({ at: [o.at[0] + x - o.size, o.at[1] + p[k + 1], o.at[2] + p[k + 2]], kind: "glow", count: 1, colors: [LAB.chemistry.gold], speed: [0, 0.02], life: [0.25, 0.35], size: [0.07, 0.09], drag: 4 });
        }
      } else if (x > o.end - o.size) {
        x = o.end - o.size;
        v[k] = -Math.abs(v[k]);
      }
      p[k] = (x - o.plunger) / len;
      p[k + 1] += v[k + 1] * o.speed * o.dt;
      p[k + 2] += v[k + 2] * o.speed * o.dt;
      const rr = Math.hypot(p[k + 1], p[k + 2]);
      const lim = o.r - o.size;
      if (rr > lim) {
        // Bounce off the round wall: flip the outward part of the velocity.
        const ny = p[k + 1] / rr;
        const nz = p[k + 2] / rr;
        const out = v[k + 1] * ny + v[k + 2] * nz;
        if (out > 0) {
          v[k + 1] -= 2 * out * ny;
          v[k + 2] -= 2 * out * nz;
        }
        p[k + 1] = ny * lim;
        p[k + 2] = nz * lim;
      }
      tmp.position.set(x, p[k + 1], p[k + 2]);
      tmp.scale.setScalar(o.size);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.impact = this.impact * Math.exp(-o.dt * 8) + hits * 0.22;
    face.position.x = o.plunger + 0.01;
    face.scale.set(o.r * 1.6, o.r * 2.4, 1);
    (face.material as SpriteMaterial).opacity = Math.min(0.75, this.impact * 0.5);
  }
}

export function PistonGas({ plunger, end, radius, zoomed, at }: { plunger: Getter<number>; end: number; radius: number; zoomed: boolean; at: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const [gas] = useState(() => new Gas(tier === "low" ? 22 : 40));
  const mesh = useRef<InstancedMesh>(null);
  const face = useRef<Sprite>(null);
  const glow = useMemo(() => glowMaterial(LAB.chemistry.gold), []);
  useEffect(() => () => glow.dispose(), [glow]);
  useFrame((_, delta) => {
    if (mesh.current && face.current) gas.step(mesh.current, face.current, { plunger: plunger(), end, r: radius, size: zoomed ? 0.024 : 0.018, speed: zoomed ? 0.45 : 0.7, dt: Math.min(delta, 1 / 30), at });
  });
  return (
    <group position={at}>
      <instancedMesh ref={mesh} args={[DOT, kitMaterial("sand", tier), gas.n]} frustumCulled={false} />
      <sprite ref={face} material={glow} />
    </group>
  );
}
