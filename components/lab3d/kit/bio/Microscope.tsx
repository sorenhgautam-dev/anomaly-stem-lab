"use client";

import { useRef, type ReactNode } from "react";
import { PerspectiveCamera, View } from "@react-three/drei";
import { cn } from "@/lib/cn";
import { useStudioEnvironment } from "@/components/three/studio-env";
import { useViewPresence } from "@/components/three/frameloop";
import { Colony } from "./Dish3D";
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

export function MicroscopeView({ children, label, caption, className, surroundClassName }: { children: ReactNode; label: string; caption?: ReactNode; className?: string; surroundClassName: string }) {
  const track = useRef<HTMLDivElement>(null);
  useViewPresence(track);
  return (
    <figure className={cn("flex flex-col items-center gap-2", className)}>
      <div role="img" aria-label={label} className="relative aspect-square w-full">
        <View ref={track} className="absolute inset-0">
          {children}
        </View>
        {/* slop-ok: the eyepiece's optical edge (vignette and the page colour outside the lens), not a decorative orb */}
        <div aria-hidden className={cn("pointer-events-none absolute inset-0 z-15 bg-[radial-gradient(circle,transparent_0_56%,rgb(0_0_0/0.28)_63%,var(--surround)_66.5%)]", surroundClassName)} />
        <div aria-hidden className="pointer-events-none absolute inset-[3%] z-15 rounded-full shadow-[inset_0_0_0_5px_rgb(18_18_18/0.85),inset_0_0_26px_rgb(0_0_0/0.35)]" />
      </div>
      {caption && <figcaption className="relative z-15 text-center">{caption}</figcaption>}
    </figure>
  );
}
