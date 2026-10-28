"use client";

import { useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, ConeGeometry, DoubleSide, IcosahedronGeometry, MeshBasicMaterial, NormalBlending, Object3D, Points, PointsMaterial, SRGBColorSpace, type InstancedMesh } from "three";
import { prefersReducedMotion } from "@/lib/motion";
import { particleScale, useQuality } from "@/lib/quality";

/*
 * The landing stage's particles, each with a physical cause (DESIGN.md §0
 * bans sparkles): dust puffing up where a ball lands, and dust motes drifting
 * through the soft beam of light over the stage. Pooled and stepped on the
 * CPU, a few dozen points at most; fewer on Medium, none on Low, and still
 * with reduced motion.
 */

const PUFF = 28;
const o = new Object3D();

/** Dust kicked up where something lands: `fire(x)` throws a small ring of it out along the floor. */
export function Puffs({ ref, y, color }: { ref?: Ref<{ fire: (x: number) => void }>; y: number; color: string }) {
  const mesh = useRef<InstancedMesh>(null);
  const pool = useRef({ pos: new Float32Array(PUFF * 3), vel: new Float32Array(PUFF * 3), age: new Float32Array(PUFF).fill(9), next: 0 });
  const [geo] = useState(() => new IcosahedronGeometry(1, 1));
  const material = useMemo(() => new MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false }), [color]);
  useImperativeHandle(ref, () => ({
    fire(x: number) {
      const state = pool.current;
      for (let n = 0; n < 9; n++) {
        const i = state.next;
        state.next = (state.next + 1) % PUFF;
        const a = (n / 9) * Math.PI * 2 + x;
        state.pos.set([x, y, 0], i * 3);
        state.vel.set([Math.cos(a) * 0.55, 0.28 + (n % 3) * 0.08, Math.sin(a) * 0.3], i * 3);
        state.age[i] = 0;
      }
    },
  }));
  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const state = pool.current;
    const dt = Math.min(delta, 1 / 30);
    for (let i = 0; i < PUFF; i++) {
      state.age[i] += dt;
      const life = state.age[i] / 0.7;
      for (let k = 0; k < 3; k++) {
        state.vel[i * 3 + k] *= 1 - dt * 3.2;
        state.pos[i * 3 + k] += state.vel[i * 3 + k] * dt;
      }
      o.position.set(state.pos[i * 3], state.pos[i * 3 + 1], state.pos[i * 3 + 2]);
      // Grows as it spreads, then thins away.
      o.scale.setScalar(life < 1 ? 0.035 * Math.sin(Math.PI * Math.min(1, life * 1.2)) + 0.012 * life : 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geo, material, PUFF]} frustumCulled={false} />;
}

/** A soft vertical gradient for the beam: brightest at the lamp, fading toward the stage. */
function beamTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** A round soft mote. */
function moteTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/**
 * The stage lamp's beam from above (a faint cone, brighter at the top) and
 * dust drifting through it. `glow` brightens the beam on a dark stage (it
 * adds light there; on a pale stage it's laid on normally).
 */
export function LightBeam({ color, dust, top = 2.6, radius = 1.15, glow = false }: { color: string; dust: string; top?: number; radius?: number; glow?: boolean }) {
  const tier = useQuality((s) => s.level);
  const [still] = useState(prefersReducedMotion);
  const count = tier === "low" ? 0 : Math.round(70 * particleScale(tier));
  const beam = useMemo(() => {
    const g = new ConeGeometry(radius, top, 40, 1, true).translate(0, top / 2, 0);
    const m = new MeshBasicMaterial({ color, map: beamTexture(), transparent: true, opacity: glow ? 0.16 : 0.22, depthWrite: false, side: DoubleSide, blending: glow ? AdditiveBlending : NormalBlending });
    return { g, m };
  }, [color, top, radius, glow]);
  const points = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Spread through the cone: wider low down, a fixed even pattern (nothing random at render).
      const h = ((i * 0.618) % 1) * top * 0.9;
      const r = (1 - h / top) * radius * Math.sqrt((i * 0.382) % 1) * 0.85;
      const a = i * 2.39996;
      pos.set([Math.cos(a) * r, h, Math.sin(a) * r * 0.5], i * 3);
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    const mat = new PointsMaterial({ color: new Color(dust), size: 0.04, map: moteTexture(), transparent: true, opacity: 0.8, depthWrite: false, sizeAttenuation: true });
    return new Points(geo, mat);
  }, [count, dust, top, radius]);
  const motes = useRef<Points>(null);
  useFrame(({ clock }, delta) => {
    const p = motes.current;
    if (!p || still) return;
    const arr = p.geometry.attributes.position.array as Float32Array;
    const dt = Math.min(delta, 1 / 30);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += dt * (0.05 + (i % 5) * 0.012);
      arr[i * 3] += Math.sin(clock.elapsedTime * 0.6 + i) * dt * 0.03;
      if (arr[i * 3 + 1] > top * 0.92) arr[i * 3 + 1] = 0.05;
    }
    p.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <group>
      <mesh geometry={beam.g} material={beam.m} renderOrder={5} />
      {count > 0 && <primitive ref={motes} object={points} />}
    </group>
  );
}
