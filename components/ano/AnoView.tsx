"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, View } from "@react-three/drei";
import { cn } from "@/lib/cn";
import { pointer } from "@/components/three/pointer";
import { useViewPresence } from "@/components/three/frameloop";
import { useStudioEnvironment } from "@/components/three/studio-env";
import { Ano, type AnoProps } from "./Ano";

/*
 * Ano anywhere in the page layout: a box in the DOM whose 3D content is drawn
 * by the site canvas (components/three/SiteCanvas). Size it with className;
 * the camera frames Ano to fit. `framing` picks a full-body or a closer shot.
 */

const FRAMING = {
  full: { position: [0, 0.32, 8.1] as [number, number, number], fov: 26, target: 0.32 },
  // Larger in its box, for the landing hero where Ano fills the stage card.
  hero: { position: [0, 0.3, 6.3] as [number, number, number], fov: 26, target: 0.28 },
  bust: { position: [0, 0.5, 5.6] as [number, number, number], fov: 26, target: 0.5 },
  // Head and shoulders only: the view's bottom edge cuts Ano at the chest, as if behind a card.
  peek: { position: [0, 1.05, 3.4] as [number, number, number], fov: 26, target: 0.95 },
};

function Studio({ framing }: { framing: keyof typeof FRAMING }) {
  useStudioEnvironment(1.18);
  const f = FRAMING[framing];
  return (
    <>
      <PerspectiveCamera makeDefault position={f.position} fov={f.fov} near={0.1} far={30} onUpdate={(c) => c.lookAt(0, f.target, 0)} />
      <SpecularSweep />
    </>
  );
}

/** Highlights sweep across Ano's gloss as the mouse moves (DESIGN.md §9.1). */
function SpecularSweep() {
  useFrame(({ scene }) => {
    const x = pointer.active ? pointer.x / window.innerWidth - 0.5 : 0;
    scene.environmentRotation.y += (x * 0.9 - scene.environmentRotation.y) * 0.06;
  });
  return null;
}

export function AnoView({ className, framing = "full", label, ...ano }: AnoProps & { className?: string; framing?: keyof typeof FRAMING; label?: string }) {
  const track = useRef<HTMLDivElement>(null);
  useViewPresence(track);
  return (
    <div className={cn("relative", className)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <View ref={track} className="absolute inset-0">
        <Studio framing={framing} />
        <Ano {...ano} track={track} />
      </View>
    </div>
  );
}
