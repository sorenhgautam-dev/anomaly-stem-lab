"use client";

import { useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  Vector3,
  type Camera,
  type Material,
} from "three";
import { particleScale, useQuality } from "@/lib/quality";
import { prefersReducedMotion } from "@/lib/motion";
import { glowTexture } from "./materials";
import { vfxQueue, type BurstSpec, type VfxKind } from "./vfx";

/*
 * The pooled particle system behind vfx.burst() / vfx.ring(): one instanced
 * mesh per kind (so at most 5 draw calls plus 3 rings), per-instance colour
 * and fade, CPU-stepped. Sparks stretch along their motion, smoke and glows
 * face the camera, confetti tumbles, bubbles rise. Low tier spawns ~70% fewer.
 */

const CAPACITY: Record<VfxKind, number> = { spark: 220, smoke: 70, bubble: 220, confetti: 260, glow: 140 };

/** Per-instance alpha: adds an attribute the shader multiplies into the colour's alpha. */
function withAlpha<T extends Material>(m: T): T {
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nattribute float aAlpha;\nvarying float vAlpha;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvAlpha = aAlpha;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vAlpha;").replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.a *= vAlpha;");
  };
  m.transparent = true;
  m.depthWrite = false;
  return m;
}

interface Pool {
  mesh: InstancedMesh;
  alpha: InstancedBufferAttribute;
  pos: Float32Array;
  vel: Float32Array;
  age: Float32Array;
  life: Float32Array;
  size: Float32Array;
  rot: Float32Array;
  spin: Float32Array;
  gravity: Float32Array;
  drag: Float32Array;
  grow: Float32Array;
  next: number;
}

function makePool(kind: VfxKind): Pool {
  const n = CAPACITY[kind];
  const geometry = kind === "spark" ? new BoxGeometry(1, 1, 1) : kind === "bubble" ? new SphereGeometry(1, 12, 8) : new PlaneGeometry(1, kind === "confetti" ? 0.5 : 1);
  const material =
    kind === "bubble"
      ? withAlpha(new MeshStandardMaterial({ color: "#ffffff", roughness: 0.1, metalness: 0 }))
      : kind === "confetti"
        ? withAlpha(new MeshStandardMaterial({ color: "#ffffff", roughness: 0.5, side: DoubleSide }))
        : withAlpha(new MeshBasicMaterial({ color: "#ffffff", map: kind === "spark" ? null : glowTexture(), toneMapped: kind !== "spark" }));
  const mesh = new InstancedMesh(geometry, material, n);
  mesh.frustumCulled = false;
  const alpha = new InstancedBufferAttribute(new Float32Array(n), 1);
  mesh.geometry.setAttribute("aAlpha", alpha);
  mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(n * 3), 3);
  mesh.count = n;
  const pool: Pool = { mesh, alpha, pos: new Float32Array(n * 3), vel: new Float32Array(n * 3), age: new Float32Array(n).fill(1), life: new Float32Array(n).fill(1), size: new Float32Array(n), rot: new Float32Array(n), spin: new Float32Array(n), gravity: new Float32Array(n), drag: new Float32Array(n), grow: new Float32Array(n), next: 0 };
  return pool;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const tmp = new Object3D();
const v = new Vector3();
const color = new Color();

function spawn(pool: Pool, b: BurstSpec) {
  const dir = b.dir ? new Vector3(...b.dir).normalize() : null;
  for (let k = 0; k < b.count; k++) {
    const i = pool.next;
    pool.next = (pool.next + 1) % pool.life.length;
    const s = b.spread ?? 0;
    pool.pos.set([b.at[0] + rand(-s, s), b.at[1] + rand(-s, s) * 0.5, b.at[2] + rand(-s, s)], i * 3);
    v.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
    if (dir) v.lerp(dir, b.cone ?? 0.7).normalize();
    v.multiplyScalar(rand(...b.speed));
    pool.vel.set([v.x, v.y, v.z], i * 3);
    pool.age[i] = -(b.delay ?? 0);
    pool.life[i] = rand(...b.life);
    pool.size[i] = rand(...b.size);
    pool.rot[i] = Math.random() * Math.PI * 2;
    pool.spin[i] = rand(-8, 8);
    pool.gravity[i] = b.gravity ?? 0;
    pool.drag[i] = b.drag ?? 1;
    pool.grow[i] = b.grow ?? 0;
    color.set(b.colors[k % b.colors.length]);
    pool.mesh.setColorAt(i, color);
  }
  if (pool.mesh.instanceColor) pool.mesh.instanceColor.needsUpdate = true;
}

/** Every pool and ring, stepped once a frame. A class, so React never sees the mutation. */
class VfxPools {
  readonly pools = Object.fromEntries((Object.keys(CAPACITY) as VfxKind[]).map((k) => [k, makePool(k)])) as Record<VfxKind, Pool>;
  readonly rings = Array.from({ length: 3 }, () => {
    const m = new Mesh(new RingGeometry(0.92, 1, 64).rotateX(-Math.PI / 2), new MeshBasicMaterial({ transparent: true, depthWrite: false, side: DoubleSide }));
    m.visible = false;
    return { mesh: m, age: 0, life: 1, from: 0, to: 1 };
  });

  dispose() {
    for (const p of Object.values(this.pools)) p.mesh.dispose();
  }

  update(camera: Camera, dt: number) {
    for (const b of vfxQueue.bursts.splice(0)) spawn(this.pools[b.kind], b);
    for (const r of vfxQueue.rings.splice(0)) {
      const slot = this.rings.find((x) => !x.mesh.visible) ?? this.rings[0];
      slot.mesh.position.set(...r.at);
      (slot.mesh.material as MeshBasicMaterial).color.set(r.color);
      Object.assign(slot, { age: -(r.delay ?? 0), life: r.life, from: r.from, to: r.to });
      slot.mesh.visible = true;
    }
    for (const ring of this.rings) {
      if (!ring.mesh.visible) continue;
      ring.age += dt;
      const t = Math.max(0, ring.age / ring.life);
      if (t >= 1) {
        ring.mesh.visible = false;
        continue;
      }
      const e = 1 - (1 - t) ** 3;
      ring.mesh.scale.setScalar(ring.from + (ring.to - ring.from) * e);
      (ring.mesh.material as MeshBasicMaterial).opacity = ring.age < 0 ? 0 : (1 - t) ** 1.5 * 0.85;
    }
    for (const kind of Object.keys(this.pools) as VfxKind[]) step(this.pools[kind], kind, camera, dt);
  }
}

function step(p: Pool, kind: VfxKind, camera: Camera, dt: number) {
  const n = p.life.length;
  for (let i = 0; i < n; i++) {
    p.age[i] += dt;
    const t = p.age[i] / p.life[i];
    if (p.age[i] < 0 || t >= 1) {
      p.alpha.setX(i, 0);
      tmp.scale.setScalar(0);
      tmp.updateMatrix();
      p.mesh.setMatrixAt(i, tmp.matrix);
      continue;
    }
    const o = i * 3;
    const drag = Math.exp(-p.drag[i] * dt);
    p.vel[o] *= drag;
    p.vel[o + 1] = p.vel[o + 1] * drag - p.gravity[i] * dt;
    p.vel[o + 2] *= drag;
    p.pos[o] += p.vel[o] * dt;
    p.pos[o + 1] += p.vel[o + 1] * dt;
    p.pos[o + 2] += p.vel[o + 2] * dt;
    tmp.position.set(p.pos[o], p.pos[o + 1], p.pos[o + 2]);
    tmp.rotation.set(0, 0, 0);
    const size = p.size[i] + p.grow[i] * p.age[i];
    if (kind === "spark") {
      v.set(p.vel[o], p.vel[o + 1], p.vel[o + 2]);
      const len = Math.max(size * 2, v.length() * 0.035);
      tmp.lookAt(v.add(tmp.position));
      tmp.scale.set(size * 0.5, size * 0.5, len);
    } else if (kind === "confetti") {
      p.rot[i] += p.spin[i] * dt;
      tmp.rotation.set(p.rot[i], p.rot[i] * 0.7, p.rot[i] * 0.3);
      tmp.scale.setScalar(size);
    } else if (kind === "bubble") {
      tmp.scale.setScalar(size * (0.6 + 0.4 * Math.min(1, t * 4)));
    } else {
      tmp.quaternion.copy(camera.quaternion);
      tmp.scale.setScalar(size);
    }
    tmp.updateMatrix();
    p.mesh.setMatrixAt(i, tmp.matrix);
    const fade = kind === "smoke" ? Math.sin(Math.PI * Math.min(1, t * 1.3 + 0.05)) * 0.6 : kind === "bubble" ? (t < 0.85 ? 0.75 : (1 - t) * 5) : (1 - t) ** (kind === "confetti" ? 0.4 : 1.3);
    p.alpha.setX(i, fade);
  }
  p.mesh.instanceMatrix.needsUpdate = true;
  p.alpha.needsUpdate = true;
}

export function Vfx() {
  const tier = useQuality((s) => s.level);
  const [system] = useState(() => new VfxPools());

  useEffect(() => {
    vfxQueue.scale = particleScale(tier) * (prefersReducedMotion() ? 0.25 : 1);
  }, [tier]);
  useEffect(() => () => system.dispose(), [system]);
  useFrame(({ camera }, delta) => system.update(camera, Math.min(delta, 1 / 30)));

  return (
    <>
      {Object.values(system.pools).map((p, i) => (
        <primitive key={i} object={p.mesh} />
      ))}
      {system.rings.map((r, i) => (
        <primitive key={`ring-${i}`} object={r.mesh} />
      ))}
    </>
  );
}
