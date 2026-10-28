"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, View } from "@react-three/drei";
import type { Group } from "three";
import type { LabId } from "@/engine/types";
import { cn } from "@/lib/cn";
import { worldOf } from "@/lib/labs";
import { prefersReducedMotion } from "@/lib/motion";
import { IconLock } from "@/components/icons/icons";
import { FitModel } from "@/components/three/FitModel";
import { useViewPresence } from "@/components/three/frameloop";
import { useLabEnvironment } from "@/components/lab3d/scene/lab-light";
import { shelfModel } from "./shelf-models";

/*
 * A small window into the lab on an experiment map node: the experiment's
 * own apparatus from the kit, turning slowly against its lab's wall colour
 * and under its lab's light (DESIGN.md §8). Locked experiments show theirs
 * behind frosted paper with a lock; coming-soon ones only the lock.
 */

function Turntable({ id, index }: { id: string; index: number }) {
  useLabEnvironment(id.startsWith("robotics") || id.startsWith("treatment") || id.startsWith("detection") ? "robotics" : "chemistry");
  const g = useRef<Group>(null);
  const [still] = useState(prefersReducedMotion);
  const [model] = useState(() => shelfModel(id));
  useFrame(({ clock }) => {
    if (g.current && !still) g.current.rotation.y = clock.elapsedTime * 0.4 + index;
  });
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.85, 3.2]} fov={30} onUpdate={(c) => c.lookAt(0, 0.5, 0)} />
      <group ref={g}>
        <FitModel width={1.15} height={1.05}>
          {model}
        </FitModel>
      </group>
    </>
  );
}

export function ApparatusWindow({ id, lab, index, locked, className }: { id: string | null; lab: LabId; index: number; locked: boolean; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  useViewPresence(track);
  return (
    <span aria-hidden className={cn("relative block size-20 shrink-0 overflow-hidden rounded-tile", lab === "prevention" ? "bg-prevent-world" : worldOf(lab) === "chemistry" ? "bg-chem-world" : "bg-robo-world", className)}>
      {id && (
        <View ref={track} className="absolute inset-0">
          <Turntable id={id} index={index} />
        </View>
      )}
      {(locked || !id) && (
        <span className="absolute inset-0 grid place-items-center bg-cream-100/70">
          <IconLock className="size-5 text-ink-500" />
        </span>
      )}
    </span>
  );
}
