"use client";

import { useEffect, useRef } from "react";
import { View } from "@react-three/drei";
import { cn } from "@/lib/cn";
import { useViewPresence } from "@/components/three/frameloop";
import { labView } from "./lab-state";
import { LabScene } from "./scene/LabScene";

/*
 * The experiment's 3D view in the page (drawn by the site canvas): full
 * screen behind the HUD on large screens, a tall box above the controls on
 * small ones. It takes pointer events for orbiting and clicking parts; the
 * HUD panels sit above it.
 */

export function LabStage({ title, className }: { title: string; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  useViewPresence(track);
  useEffect(() => {
    labView.el = track.current;
    return () => {
      labView.el = null;
    };
  }, []);
  return (
    <div className={cn("relative", className)} role="img" aria-label={`${title}, in 3D. Drag to look around, scroll to zoom, double-click to reset the view.`}>
      <View ref={track} className="absolute inset-0 touch-pan-y">
        <LabScene track={track} />
      </View>
    </div>
  );
}
