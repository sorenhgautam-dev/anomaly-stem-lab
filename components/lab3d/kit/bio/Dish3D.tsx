"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, IcosahedronGeometry, InstancedMesh, MeshStandardMaterial, Object3D, Vector3 } from "three";
import { useQuality } from "@/lib/quality";
import { corner, latheGeometry, shellGeometry, type Profile } from "../detail";
import { kitMaterial } from "../materials";
import type { Getter } from "../chem/glass";
import { cellMaterials, hash01 } from "./cell-material";

/*
 * The Cell Lab's apparatus (DESIGN.md §8 "Cells and tissue"): a glass petri
 * dish (lathed, with a real rim and a thin layer of pale gel inside) and a
 * colony of living cells in the lab's palette (cell-material.ts): soft,
 * slightly see-through membranes with a darker nucleus, wobbling gently.
 * Cells are never red or realistic tissue. The colony follows the simulator
 * each frame through a getter: new cells split off their parents, cells past
 * the dish's room pile up in a second layer, and cells that are lost fade
 * and shrink (never burst).
 */

/** A petri dish's outer profile: a flat base, a small heel and a low, straight wall. */
function dishProfile(r: number, h: number): Profile {
  const heel = h * 0.25;
  return [[0.001, 0], [r - heel, 0], ...corner(r - heel, heel, heel, -Math.PI / 2, 0).slice(1), [r, h]];
}

export function Dish3D({ radius = 0.34, height = 0.07, gel = "#EAF2E6", position, children }: { radius?: number; height?: number; gel?: string; position?: [number, number, number]; children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  const wall = 0.006;
  const glass = useMemo(() => shellGeometry(dishProfile(radius, height), wall, wall * 1.5, 72), [radius, height]);
  const layer = useMemo(() => latheGeometry([[0.001, 0], [radius - wall * 1.4, 0], [radius - wall * 1.4, height * 0.28], [0.001, height * 0.28]], 64), [radius, height]);
  const gelMaterial = useMemo(() => new MeshStandardMaterial({ color: gel, roughness: 0.35, transparent: true, opacity: 0.9 }), [gel]);
  useEffect(
    () => () => {
      glass.dispose();
      layer.dispose();
      gelMaterial.dispose();
    },
    [glass, layer, gelMaterial],
  );
  return (
    <group position={position}>
      <mesh geometry={layer} material={gelMaterial} position={[0, wall * 1.5, 0]} />
      <mesh geometry={glass} material={kitMaterial("glass", tier)} renderOrder={1} />
      {children}
    </group>
  );
}

const MAX = 320;
/** Scratch objects for placing instances each frame (one frame at a time, so they can be shared). */
const o = new Object3D();
const from = new Vector3();
const dir = new Vector3();

/** Spots on a disc, packed by the golden angle so a growing colony fills the dish evenly from the middle out. */
function spots(count: number, radius: number): Vector3[] {
  const out: Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const r = radius * Math.sqrt((i + 0.5) / count);
    out.push(new Vector3(Math.cos(i * golden) * r, 0, Math.sin(i * golden) * r));
  }
  return out;
}

/**
 * A colony of living cells. `count` is how many there are now (a getter,
 * read each frame); `room` is how many fit in one layer, past which cells
 * pile up. `faded` (0..1) greys and shrinks the colony a little when it's
 * been hit. A new cell splits off its parent: it starts inside it, the pair
 * pinches into a peanut, then the new cell glides to its own spot. Two
 * instanced meshes: the see-through membranes and the darker nuclei.
 */
export function Colony({ count, room, radius = 0.3, size = 0.034, color, faded = () => 0, y = 0.024, opacity = 1 }: { count: Getter<number>; room: number; radius?: number; size?: number; color: string; faded?: Getter<number>; y?: number; opacity?: number }) {
  const tier = useQuality((s) => s.level);
  const skin = useRef<InstancedMesh>(null);
  const core = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new IcosahedronGeometry(1, tier === "low" ? 2 : 3), [tier]);
  const coreGeometry = useMemo(() => new IcosahedronGeometry(1, 1), []);
  const mats = useMemo(() => cellMaterials(color, tier, { see: opacity }), [color, tier, opacity]);
  const layout = useMemo(() => {
    const first = spots(room, radius);
    // The second layer sits in the dips of the first, a little smaller.
    const second = spots(MAX - room, radius * 0.86).map((p) => p.clone().add(new Vector3(0.012, size * 1.5, 0.012)));
    return [...first, ...second].slice(0, MAX);
  }, [room, radius, size]);
  const shown = useRef<number[]>(new Array(MAX).fill(0));
  const base = useMemo(() => new Color(color), [color]);
  const grey = useMemo(() => new Color("#cfd3cf"), []);

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
    const n = Math.max(0, Math.min(MAX, count()));
    const fade = Math.max(0, Math.min(1, faded()));
    const k = Math.min(1, delta * 4);
    mats.tick(state.clock.elapsedTime);
    ((mats.membrane as MeshStandardMaterial).color as Color).copy(base).lerp(grey, fade * 0.6);
    for (let i = 0; i < MAX; i++) {
      // Each cell eases in or out: a split when it appears, a soft shrink when it goes.
      const want = i < Math.floor(n) ? 1 : i < n ? n - Math.floor(n) : 0;
      shown.current[i] += (want - shown.current[i]) * k;
      const s = shown.current[i];
      const p = layout[i];
      // Born from its parent (the cell half its index): it glides out of it, pinched where they part.
      const parent = layout[Math.max(0, (i - 1) >> 1)];
      const out = i === 0 ? 1 : Math.min(1, s * 1.25);
      from.copy(parent).lerp(p, out);
      const size01 = 0.82 + hash01(i) * 0.36;
      const r = size * size01 * Math.min(1, s * 1.6) * (1 - fade * 0.25);
      const pinch = i > 0 && s > 0.02 && s < 0.98 ? Math.sin(Math.PI * s) * 0.32 : 0;
      dir.subVectors(p, parent).setY(0);
      o.position.set(from.x, y + from.y, from.z);
      o.rotation.set(0, Math.atan2(-dir.z, dir.x), 0);
      // Stretched along the split while it parts, a little flat like a cell on a dish.
      o.scale.set(r * (1 + pinch), r * 0.8, r * (1 - pinch * 0.45));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      o.scale.multiplyScalar(0.42);
      o.position.y += r * 0.06;
      o.updateMatrix();
      c.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    c.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={core} args={[coreGeometry, mats.nucleus, MAX]} frustumCulled={false} />
      <instancedMesh ref={skin} args={[geometry, mats.membrane, MAX]} frustumCulled={false} renderOrder={2} />
    </group>
  );
}
