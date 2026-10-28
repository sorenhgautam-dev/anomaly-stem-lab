"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { PerspectiveCamera, View } from "@react-three/drei";
import { cn } from "@/lib/cn";
import { useStudioEnvironment } from "@/components/three/studio-env";
import { useViewPresence } from "@/components/three/frameloop";
import { Colony, dealSpots, spots } from "./Dish3D";
import type { Getter } from "../chem/glass";

/*
 * Looking down a microscope (the brief's "microscope view"): a top-down view
 * of living cells that fill a round eyepiece, with a dark bezel and a soft
 * vignette at the edge, the way a slide looks through a real microscope.
 * The cells sit on a pale slide that fills the whole circle, so there's
 * never an empty patch. Used by How it works, the chemo experiment and the
 * Cell Lab. The surround outside the circle takes the page's colour
 * (`surround`, a CSS colour), so the square view box never shows.
 */

/** The cells under the lens, filling the eyepiece. */
export function MicroscopeCells({ count, room = 48, color, ghost, faded, slide = "#EEF2EA", bare = false }: { count: Getter<number>; room?: number; color: string; ghost?: Getter<number> | null; faded?: Getter<number>; slide?: string; bare?: boolean }) {
  // Bare (over the lab, no page colour round it): the slide and cells stay inside the lens, so nothing spills into the corners.
  const lens = bare ? 0.315 : 0.7;
  const spread = bare ? 0.29 : 0.34;
  useStudioEnvironment(1.05, "chemistry");
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.18, 0.001]} fov={32} onUpdate={(c) => c.lookAt(0, 0, 0)} />
      {/* A rim light low across the slide, so each membrane's edge catches it. */}
      <directionalLight position={[-1.2, 0.9, -0.6]} intensity={1.6} />
      <directionalLight position={[0.8, 1.4, 0.9]} intensity={0.7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <circleGeometry args={[lens, 64]} />
        <meshStandardMaterial color={slide} roughness={0.55} />
      </mesh>
      {/* Few, large cells, so each membrane and nucleus is easy to see at this zoom. */}
      <Colony count={count} room={room} radius={spread} size={0.066} color={color} faded={faded} y={0.03} />
      {ghost && <Colony count={ghost} room={room} radius={spread} size={0.066} color="#ffffff" opacity={0.42} y={0.08} />}
    </>
  );
}

export interface FieldGroup {
  key: string;
  color: string;
  /** Cells now (a getter, read each frame). */
  count: Getter<number>;
  /** 0..1: how hard the group has been hit (cells grey and shrink a little). */
  faded?: Getter<number>;
  /** The student's idea for this group: see-through cells at the same spots. */
  ghost?: Getter<number> | null;
}

/**
 * Several kinds of living cells mixed in one dark field (the chemo
 * experiment's cancer, hair follicle and slow-dividing cells). One golden
 * spiral of spots is dealt out to the groups in turn, so the kinds sit side
 * by side all over the field; a group that loses cells loses its outermost
 * ones first, each shrinking away, and refills from the middle out.
 */
export function MicroscopeMix({ groups, room = 30, field = "#0d0f11" }: { groups: FieldGroup[]; room?: number; field?: string }) {
  // Dimmer reflections than the pale slides: on a dark field the cells carry their own colour.
  useStudioEnvironment(0.55, "chemistry");
  const kinds = groups.length;
  const dealt = useMemo(() => dealSpots(spots(room * kinds, 0.29), kinds), [room, kinds]);
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.18, 0.001]} fov={32} onUpdate={(c) => c.lookAt(0, 0, 0)} />
      <directionalLight position={[-1.2, 0.9, -0.6]} intensity={1.7} />
      <directionalLight position={[0.8, 1.4, 0.9]} intensity={0.8} />
      {/* The field is exactly the lens: outside it the page shows through, whatever colour it is there. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <circleGeometry args={[0.322, 96]} />
        <meshStandardMaterial color={field} roughness={0.9} />
      </mesh>
      {groups.map((g, i) => (
        <group key={g.key}>
          <Colony count={g.count} room={room} at={dealt[i]} size={0.026} color={g.color} faded={g.faded} y={0.03} glow={0.32} />
          {g.ghost && <Colony count={g.ghost} room={room} at={dealt[i]} size={0.026} color="#ffffff" opacity={0.3} y={0.08} />}
        </group>
      ))}
    </>
  );
}

export function MicroscopeView({ children, label, caption, className, surroundClassName, rim = "dark" }: { children: ReactNode; label: string; caption?: ReactNode; className?: string; surroundClassName: string; rim?: "dark" | "metal" }) {
  const track = useRef<HTMLDivElement>(null);
  useViewPresence(track);
  return (
    <figure className={cn("flex flex-col items-center gap-2", className)}>
      <div role="img" aria-label={label} className="relative aspect-square w-full">
        <View ref={track} className="absolute inset-0">
          {children}
        </View>
        {/* slop-ok: the eyepiece's optical edge (vignette and the page colour outside the lens), not a decorative orb */}
        {/* The metal-rim field fills exactly the lens, so its vignette darkens only inside the lens and the page shows round it. */}
        <div aria-hidden className={cn("pointer-events-none absolute inset-0 z-15", rim === "metal" ? "bg-[radial-gradient(circle,transparent_0_50%,rgb(0_0_0/0.5)_66%,transparent_66.6%)]" : "bg-[radial-gradient(circle,transparent_0_56%,rgb(0_0_0/0.28)_63%,var(--surround)_66.5%)]", surroundClassName)} />
        {/* The eyepiece's edge: a dark bezel, or a thin brushed-metal rim (two tones of steel) for the big field view. */}
        <div aria-hidden className={cn("pointer-events-none absolute inset-[3%] z-15 rounded-full", rim === "metal" ? "shadow-[0_0_0_2px_rgb(206_210_214),0_0_0_4px_rgb(98_103_110),inset_0_0_34px_rgb(0_0_0/0.5)]" : "shadow-[inset_0_0_0_5px_rgb(18_18_18/0.85),inset_0_0_26px_rgb(0_0_0/0.35)]")} />
      </div>
      {caption && <figcaption className="relative z-15 text-center">{caption}</figcaption>}
    </figure>
  );
}
