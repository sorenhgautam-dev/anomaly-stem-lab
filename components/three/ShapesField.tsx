"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, View } from "@react-three/drei";
import { Color, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, type Material } from "three";
import { prefersReducedMotion } from "@/lib/motion";
import { useQuality } from "@/lib/quality";
import { useViewPresence } from "./frameloop";
import { pointer } from "./pointer";
import { specimenMaterial } from "./shape-meshes";
import { COMPACT_COUNT, LAYOUTS, SHAPE_KINDS, SHAPES_CAMERA, ShapeSim, type ShapeSpec } from "./shapes";
import { specimenParts, type SpecimenPart } from "./specimens";
import { useStudioEnvironment } from "./studio-env";

/*
 * The floating specimens behind a hero (components/three/shapes.ts has the
 * layout and physics, specimens.ts the models): one instanced mesh per part
 * of each kind in the layout (glass, liquid or solid), so a field is about a
 * dozen draw calls (materials per tier in shape-meshes.ts; fewer specimens on
 * Low and on phones). Reduced motion: they hold still.
 *
 * Views share the canvas's depth buffer, so this view draws first (index
 * 0.5) and then clears depth inside its own rectangle: Ano and any other
 * view on top are never cut by a shape's depth.
 */

const PARTS: SpecimenPart[] = ["solid", "accent", "liquid", "glass"];

/** A field's two colours (each specimen takes one, by its spec's `tone`); without one, specs keep their own colour. */
export interface SpecimenPalette {
  a: string;
  b: string;
}

/** Clears depth after the shapes are drawn (see the note above). */
function makeDepthClear(): Mesh {
  const m = new Mesh(new PlaneGeometry(0.001, 0.001), new MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true }));
  m.frustumCulled = false;
  m.renderOrder = 9999;
  m.onAfterRender = (renderer) => renderer.clearDepth();
  return m;
}

function Field({ specs, track, palette }: { specs: ShapeSpec[]; track: RefObject<HTMLElement | null>; palette?: SpecimenPalette }) {
  useStudioEnvironment(1.25);
  const level = useQuality((s) => s.level);
  const [reduced] = useState(prefersReducedMotion);
  const sim = useMemo(() => new ShapeSim(specs), [specs]);
  // Liquid draws before the glass around it; solids are opaque.
  const groups = useMemo(
    () =>
      SHAPE_KINDS.flatMap((kind) => {
        const index = specs.flatMap((s, i) => (s.kind === kind ? [i] : []));
        if (index.length === 0) return [];
        const parts = specimenParts(kind);
        return PARTS.filter((part) => parts[part]).map((part) => ({ key: `${kind}-${part}`, part, index, geometry: parts[part]! }));
      }),
    [specs],
  );
  const mats = useMemo(() => Object.fromEntries(PARTS.map((part) => [part, specimenMaterial(part, level)])) as Record<SpecimenPart, Material>, [level]);
  const depthClear = useMemo(() => makeDepthClear(), []);
  const meshes = useRef<(InstancedMesh | null)[]>([]);
  const dummy = useMemo(() => new Object3D(), []);
  const lastClick = useRef(-1);

  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  useEffect(
    () => () => {
      depthClear.geometry.dispose();
      (depthClear.material as Material).dispose();
    },
    [depthClear],
  );

  // Each specimen's colour now and the one it's heading for: a new palette cross-fades over about half a second.
  const colours = useMemo(() => specs.map((s) => ({ now: new Color(s.color), target: new Color(s.color) })), [specs]);
  const settled = useRef(false);
  useEffect(() => {
    specs.forEach((s, i) => colours[i].target.set(palette ? palette[s.tone ?? "a"] : s.color));
    settled.current = false;
  }, [palette, specs, colours]);

  const paint = useCallback((k: number) => {
    const white = new Color("#ffffff");
    groups.forEach((g, gi) => {
      const mesh = meshes.current[gi];
      if (!mesh) return;
      // Glass and baked solids stay as they are; liquid and accent parts take the specimen's colour.
      g.index.forEach((i, n) => {
        const c = colours[i];
        if (k < 1) c.now.lerp(c.target, k);
        else c.now.copy(c.target);
        mesh.setColorAt(n, g.part === "glass" || g.part === "solid" ? white : c.now);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [groups, colours]);
  useEffect(() => paint(1), [paint, mats]);

  useFrame(({ scene }, delta) => {
    if (!settled.current) {
      paint(reduced ? 1 : 1 - Math.exp(-Math.min(delta, 1 / 30) * 6));
      settled.current = colours.every((c) => Math.abs(c.now.r - c.target.r) + Math.abs(c.now.g - c.target.g) + Math.abs(c.now.b - c.target.b) < 0.004);
    }
    const r = track.current?.getBoundingClientRect();
    if (!r || r.width < 1) return;
    const inside = pointer.active && pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
    const toNx = (x: number) => ((x - r.left) / r.width) * 2 - 1;
    const toNy = (y: number) => -(((y - r.top) / r.height) * 2 - 1);
    let click = null;
    if (pointer.down.at !== lastClick.current) {
      lastClick.current = pointer.down.at;
      const d = pointer.down;
      if (d.at > 0 && d.x >= r.left && d.x <= r.right && d.y >= r.top && d.y <= r.bottom) click = { nx: toNx(d.x), ny: toNy(d.y) };
    }
    // Reduced motion: no time passes and nothing pushes, so the shapes hold still (but still fit the view).
    if (reduced) sim.step(0, r.width / r.height, { nx: null, ny: null, click: null });
    else sim.step(Math.min(delta, 1 / 30), r.width / r.height, { nx: inside ? toNx(pointer.x) : null, ny: inside ? toNy(pointer.y) : null, click });
    // Highlights sweep across the gloss as the mouse moves (DESIGN.md §9.1).
    const sweep = pointer.active ? (pointer.x / window.innerWidth - 0.5) * 1.1 : 0;
    scene.environmentRotation.y += (sweep - scene.environmentRotation.y) * 0.05;

    groups.forEach((g, gi) => {
      const mesh = meshes.current[gi];
      if (!mesh) return;
      g.index.forEach((i, k) => {
        const b = sim.bodies[i];
        dummy.position.set(b.wx, b.wy, b.spec.z);
        dummy.rotation.set(b.rot[0], b.rot[1], b.rot[2]);
        dummy.scale.setScalar(b.size);
        dummy.updateMatrix();
        mesh.setMatrixAt(k, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, SHAPES_CAMERA.z]} fov={SHAPES_CAMERA.fov} near={0.5} far={30} />
      {groups.map((g, gi) => (
        <instancedMesh
          key={`${g.key}-${level}`}
          ref={(m) => {
            meshes.current[gi] = m;
          }}
          args={[g.geometry, mats[g.part], g.index.length]}
          renderOrder={g.part === "glass" ? 2 : g.part === "liquid" ? 1 : 0}
          frustumCulled={false}
        />
      ))}
      <primitive object={depthClear} />
    </>
  );
}

/** Shapes floating across the box this is placed in (absolute, fills its parent). */
export function ShapesField({ layout, palette, className }: { layout: keyof typeof LAYOUTS; palette?: SpecimenPalette; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const level = useQuality((s) => s.level);
  const [compact, setCompact] = useState(false);
  useViewPresence(track);
  // Phones and the Low tier get the first few shapes only (read after mount: no hydration mismatch).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const all = LAYOUTS[layout];
  const specs = useMemo(() => all.slice(0, compact ? COMPACT_COUNT[layout] : level === "low" ? Math.ceil(all.length * 0.6) : all.length), [all, compact, layout, level]);
  return (
    <div aria-hidden className={className ?? "pointer-events-none absolute inset-0"}>
      <View ref={track} index={0.5} className="absolute inset-0">
        <Field specs={specs} track={track} palette={palette} />
      </View>
    </div>
  );
}
