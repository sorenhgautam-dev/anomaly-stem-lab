"use client";

import { useRef } from "react";
import { View } from "@react-three/drei";
import landing from "@/content/landing.json";
import { cn } from "@/lib/cn";
import { useViewPresence } from "@/components/three/frameloop";
import { DropScene } from "./DropScene";

/*
 * The teaser's 3D view (drawn by the site canvas), with the two ball labels
 * as page text under their columns.
 */

export function DropView({ className }: { className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  useViewPresence(track);
  return (
    <div className={cn("relative", className)} role="img" aria-label="A steel ball and a glass ball of the same size on a ledge above the floor">
      <View ref={track} className="absolute inset-0">
        <DropScene track={track} />
      </View>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[9%] z-20 flex justify-center gap-[12%]">
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 shadow-warm-sm">{landing.hero.balls.steel}</span>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 shadow-warm-sm">{landing.hero.balls.glass}</span>
      </div>
    </div>
  );
}
