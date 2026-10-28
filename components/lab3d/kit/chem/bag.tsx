"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CapsuleGeometry, InstancedMesh, MeshStandardMaterial, Object3D, PlaneGeometry, Shape, ShapeGeometry, SphereGeometry, type BufferGeometry, type Mesh } from "three";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { canvasTexture } from "../detail";
import { kitMaterial } from "../materials";
import type { Getter } from "./glass";

/*
 * A zip bag (DESIGN.md §7.5 kit "sealed bag", §8.2), modelled like a real
 * one lying on its side: a milky, crinkled plastic pillow that is flat at its welded
 * seams and puffs up into a low pillow (flat on top, never a dome) as gas fills it, a semi-opaque seam all
 * round the edge, a two-ridge zip along the front (sage and sand gold,
 * Chemistry's palette) that is pressed shut or gaping open, and the white
 * write-on panel a freezer bag has printed on it. A cloud of gas
 * molecules bounces inside (CO₂ here).
 */

const W = 1.2;
const D = 0.9;
/** Height of the pillow's middle when the bag is just closed over the cup, and when fully puffed up: a puffed bag is a low pillow, never a dome. */
const REST = 0.28;
const FULL = 0.5;
/** The crinkles that stay even when it's puffed up (film never goes glass-smooth). */
const MIN_CRINKLE = 0.45;

/**
 * A unit-height pillow: flat at the welded edges, domed in the middle, with
 * soft sides like film pulled to a seam (not a cloche's straight walls). The
 * slack film has a few crinkles; a morph target holds the taut, smooth shape
 * the bag takes as gas puffs it up.
 */
function pillowGeometry(): BufferGeometry {
  const shape = (crinkled: boolean) => {
    const g = new BoxGeometry(W, 1, D, 44, 1, 34);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = (2 * p.getX(i)) / W;
      const v = (2 * p.getZ(i)) / D;
      // A pillow: flat across the top, rounding steeply down to the welded seams (a superellipse, not a dome).
      const f = Math.max(0, 1 - u ** 4) ** 0.45 * Math.max(0, 1 - v ** 4) ** 0.45;
      // Folds are strongest halfway between the middle and the seam, where slack film gathers.
      const fold = crinkled ? 0.05 * 4 * f * (1 - f) * (Math.sin(u * 7.3 + v * 2.1) * Math.sin(v * 5.7 - u * 1.3) + 0.5 * Math.sin(u * 13 - v * 11)) : 0;
      // The underside sits a hair above whatever the bag rests on (no z-fighting with the scale's pan).
      p.setY(i, p.getY(i) > 0 ? 0.035 + 0.965 * f + fold : 0.004);
    }
    g.computeVertexNormals();
    return g;
  };
  const g = shape(true);
  const taut = shape(false);
  g.morphAttributes.position = [taut.attributes.position];
  g.morphAttributes.normal = [taut.attributes.normal];
  return g;
}

/** The welded seam: a flat frame round the bag's edge. */
function seamGeometry(): BufferGeometry {
  const rect = (w: number, d: number, r: number) => {
    const s = new Shape();
    s.moveTo(-w / 2 + r, -d / 2);
    s.lineTo(w / 2 - r, -d / 2);
    s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
    s.lineTo(w / 2, d / 2 - r);
    s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
    s.lineTo(-w / 2 + r, d / 2);
    s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
    s.lineTo(-w / 2, -d / 2 + r);
    s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
    return s;
  };
  const outer = rect(W + 0.03, D + 0.03, 0.04);
  outer.holes.push(rect(W - 0.03, D - 0.03, 0.03));
  return new ShapeGeometry(outer, 6).rotateX(-Math.PI / 2);
}

let seam: MeshStandardMaterial | null = null;
/** The welded seam: milky, half see-through film. */
function seamMaterial() {
  seam ??= new MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.5, roughness: 0.3, depthWrite: false });
  return seam;
}

let shapes: { pillow: BufferGeometry; seam: BufferGeometry; ridge: BufferGeometry; panel: BufferGeometry } | null = null;
function bagShapes() {
  shapes ??= { pillow: pillowGeometry(), seam: seamGeometry(), ridge: new CapsuleGeometry(0.011, W * 0.92, 6, 12).rotateZ(Math.PI / 2), panel: new PlaneGeometry(0.46, 0.2) };
  return shapes;
}

let panelMat: MeshStandardMaterial | null = null;
/** A matte white write-on panel with three ruled lines, like the one printed on a freezer bag. */
function panelMaterial() {
  panelMat ??= new MeshStandardMaterial({
    map: canvasTexture("bag-panel", 256, 112, (ctx, w, h) => {
      ctx.fillStyle = "#f7f7f4";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#b9bdb8";
      ctx.lineWidth = 3;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(18, (h * i) / 4);
        ctx.lineTo(w - 18, (h * i) / 4);
        ctx.stroke();
      }
    }),
    roughness: 0.8,
    transparent: true,
    opacity: 0.92,
  });
  return panelMat;
}

export function ZipBag3D({ inflate, sealed, position, children }: { inflate: Getter<number>; sealed: boolean; position?: [number, number, number]; children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  const g = bagShapes();
  const body = useRef<Mesh>(null);
  const panel = useRef<Mesh>(null);
  // Set the morph influences up before anything renders the bag (contact shadows render the scene first).
  useLayoutEffect(() => body.current?.updateMorphTargets(), []);
  useFrame(() => {
    const m = body.current;
    if (!m) return;
    const k = Math.max(0, Math.min(1, inflate()));
    const h = REST + k * (FULL - REST);
    m.scale.set(1, h, 1);
    // The panel sits on the pillow's flat top (just above the film).
    if (panel.current) panel.current.position.y = h * 0.995 + 0.004;
    // The crinkles pull out as the film goes taut, but some always stay.
    if (m.morphTargetInfluences) m.morphTargetInfluences[0] = Math.min(1 - MIN_CRINKLE, k * 1.2);
  });
  return (
    <group position={position}>
      <mesh ref={body} geometry={g.pillow} material={kitMaterial("film", tier)} renderOrder={2} />
      <mesh geometry={g.seam} position={[0, 0.008, 0]} material={seamMaterial()} renderOrder={3} />
      {children}
      {/* The zip runs along the front seam, where you can see it: two coloured ridges pressed together, or gaping open. */}
      <group position={[0, 0.02, D / 2 + 0.004]}>
        <mesh geometry={g.ridge} position={[0, 0, sealed ? 0.011 : 0.03]} material={kitMaterial("sage", tier)} />
        <mesh geometry={g.ridge} position={[0, sealed ? 0 : 0.03, sealed ? -0.011 : -0.03]} rotation={[sealed ? 0 : 0.5, 0, 0]} material={kitMaterial("sand", tier)} />
      </group>
      {/* The white write-on panel printed on a freezer bag, riding on the film's top. */}
      <mesh ref={panel} geometry={g.panel} material={panelMaterial()} position={[0.18, 0, 0.12]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3} />
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

export function GasCloud({ count, radii, size = 0.03, speed = 1, color = P.white, max = 80, position }: { count: Getter<number>; radii: Getter<[number, number, number]>; size?: number; speed?: number; color?: string; max?: number; position?: [number, number, number] }) {
  const mesh = useRef<InstancedMesh>(null);
  const [cloud] = useState(() => new Cloud(max));
  const material = useMemo(() => new MeshStandardMaterial({ color, roughness: 0.35, emissive: LAB.chemistry.sage, emissiveIntensity: 0.2 }), [color]);
  useFrame((_, delta) => {
    if (mesh.current) cloud.step(mesh.current, Math.max(0, Math.min(max, Math.round(count()))), radii(), size, speed, Math.min(delta, 1 / 30));
  });
  return <instancedMesh ref={mesh} args={[DOT, material, max]} position={position} frustumCulled={false} />;
}
