"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, PerspectiveCamera, RoundedBox, View } from "@react-three/drei";
import type { Group } from "three";
import type { LabId } from "@/engine/types";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/motion";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { FitModel } from "@/components/three/FitModel";
import { Inspectable } from "@/components/three/Inspectable";
import { useViewPresence } from "@/components/three/frameloop";
import { useStudioEnvironment } from "@/components/three/studio-env";
import { kitMaterial } from "@/components/lab3d/kit/materials";
import { shelfModel } from "./shelf-models";

/*
 * The level's experiments as real apparatus on a little shelf (one 3D view):
 * each experiment's model from the lab kit, fitted to its slot and standing
 * on the plank, turning slowly. Hovering or focusing a slot lifts its model
 * and shows the experiment's name on a paper tag. The slots are a plain list
 * over the view, one equal column per model, so the names are real text.
 * Phones get two shelves of up to four.
 */

/** One experiment on the shelf. */
export interface ShelfItem {
  id: string;
  title: string;
  lab: LabId;
}

const FOV = 24;
const DIST = 6;
/** Height of the slot a model is fitted into, in world units. */
const FIT_H = 1.35;
/** How far in from each end the first and last slots start (a share of the shelf), so the end models aren't cut. */
const INSET = 0.04;

/** A model on its slot: fitted, turning slowly, lifted when its slot is hovered. */
function Slot({ width, lifted, index, title, lab, children }: { width: number; lifted: boolean; index: number; title: string; lab: string; children: ReactNode }) {
  const g = useRef<Group>(null);
  const [still] = useState(prefersReducedMotion);
  useFrame(({ clock }, dt) => {
    const o = g.current;
    if (!o) return;
    if (!still) o.rotation.y = Math.sin(clock.elapsedTime * 0.35 + index * 0.9) * 0.45;
    o.position.y += ((lifted ? 0.12 : 0) - o.position.y) * Math.min(1, dt * 10);
    o.scale.setScalar(o.scale.x + ((lifted ? 1.08 : 1) - o.scale.x) * Math.min(1, dt * 10));
  });
  return (
    <group ref={g}>
      {/* Drag to turn it, click for its label. */}
      <Inspectable name={title} values={() => `${lab} lab`} height={FIT_H}>
        <FitModel width={width * 0.72} height={FIT_H}>
          {children}
        </FitModel>
      </Inspectable>
    </group>
  );
}

function ShelfScene({ items, hovered }: { items: ShelfItem[]; hovered: number | null }) {
  useStudioEnvironment(1.15);
  // Compile this shelf's shaders in the background as soon as it's built (even while hidden), so showing it never stalls a frame.
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    void gl.compileAsync(scene, camera);
  }, [gl, scene, camera]);
  const tier = useQuality((s) => s.level);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  // The cabinet spans the view; equal slots across its inner INSET line up with the list's columns.
  const halfW = DIST * Math.tan(((FOV / 2) * Math.PI) / 180) * aspect;
  const inner = halfW * (1 - INSET * 2);
  const slot = (inner * 2) / items.length;
  const backH = Math.min(2.05, 0.95 + aspect * 0.22);
  const models = useMemo(() => items.map((e) => shelfModel(e.id)), [items]);
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.5, DIST]} fov={FOV} onUpdate={(c) => c.lookAt(0, 0.66, 0)} />
      {/* A deep teal cabinet back, so clear glass and pale plastic read against it (on bare sage they faded out); lower on narrow shelves, whose models are fitted smaller. */}
      <RoundedBox args={[halfW * 2 - 0.1, backH, 0.08]} radius={0.12} smoothness={4} position={[0, backH / 2 - 0.17, -0.62]} material={kitMaterial("matte", tier, LAB.chemistry.wall)} />
      {/* The plank in Chemistry's bench beige, with a sand-gold lip (orange stays Ano's). */}
      <RoundedBox args={[halfW * 2 - 0.1, 0.14, 1.1]} radius={0.05} smoothness={3} position={[0, -0.07, 0]} material={kitMaterial("satin", tier, LAB.chemistry.bench)} />
      <RoundedBox args={[halfW * 2 - 0.1, 0.22, 0.07]} radius={0.03} smoothness={3} position={[0, -0.03, 0.55]} material={kitMaterial("satin", tier, LAB.chemistry.gold)} />
      {items.map(({ id }, i) => (
        <group key={id} position={[-inner + slot * (i + 0.5), 0, -0.08]}>
          <Slot width={slot} lifted={hovered === i} index={i} title={items[i].title} lab={items[i].lab === "chemistry" ? "Chemistry" : "Robotics"}>
            {models[i]}
          </Slot>
        </group>
      ))}
      <ContactShadows frames={1} position={[0, 0.002, 0]} scale={[halfW * 2, 1]} far={1.2} blur={2} opacity={0.35} color={LAB.chemistry.floor} resolution={512} />
    </>
  );
}

function Row({ experiments, offset }: { experiments: ShelfItem[]; offset: number }) {
  const track = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  useViewPresence(track);
  return (
    <div className="relative h-44 sm:h-60">
      <View ref={track} className="absolute inset-0">
        <ShelfScene items={experiments} hovered={hovered} />
      </View>
      <ul className="absolute inset-y-0 left-[4%] right-[4%] grid" style={{ gridTemplateColumns: `repeat(${experiments.length}, minmax(0, 1fr))` }}>
        {experiments.map((e, i) => (
          <li
            key={e.id}
            tabIndex={0}
            aria-label={e.title}
            onPointerEnter={() => setHovered(i)}
            onPointerLeave={() => setHovered((h) => (h === i ? null : h))}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered((h) => (h === i ? null : h))}
            className="group relative rounded-card outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
            data-shelf-slot={offset + i}
          >
            <span
              className={cn(
                "paper-card pointer-events-none absolute top-1 z-10 w-max max-w-[11rem] translate-y-1 rounded-tile opacity-0 transition-[opacity,translate] duration-200 ease-out-soft group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100",
                // Centred over its model, except at the ends, where the tag stays inside the shelf.
                i === 0 ? "left-0" : i === experiments.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2",
              )}
            >
              <span className="block px-2.5 py-1.5 text-center text-[13px] font-semibold leading-tight text-ink-900">{e.title}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LevelShelf({ experiments, className }: { experiments: ShelfItem[]; className?: string }) {
  // One shelf on wide screens, two on phones (read after mount: no hydration mismatch).
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const rows = narrow ? [experiments.slice(0, Math.ceil(experiments.length / 2)), experiments.slice(Math.ceil(experiments.length / 2))] : [experiments];
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {rows.map((row, r) => (
        <Row key={`${r}-${row.map((e) => e.id).join()}`} experiments={row} offset={r === 0 ? 0 : rows[0].length} />
      ))}
    </div>
  );
}
