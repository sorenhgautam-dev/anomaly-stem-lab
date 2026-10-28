"use client";

import { useRef, useState } from "react";
import { PerspectiveCamera, View } from "@react-three/drei";
import { prefersReducedMotion } from "@/lib/motion";
import { LAB } from "@/lib/tokens";
import { Cluster } from "@/components/lab3d/kit/bio/Cluster";
import { useStudioEnvironment } from "@/components/three/studio-env";
import { useViewPresence } from "@/components/three/frameloop";

/*
 * Behind the final call to action (DESIGN.md §7.1 item 7): a calm cluster of
 * soft sage cells that divides, slowly: 16 cells become 32, then 64, then
 * settle back and begin again. A physical cause, nothing decorative: it's
 * cell division, the idea the whole site starts from. Reduced motion holds
 * one still cluster.
 */

const STEPS = [16, 32, 64, 64, 32];
const STEP_S = 2.6;

function Cells() {
  useStudioEnvironment(1, "chemistry");
  const [still] = useState(prefersReducedMotion);
  // The clock starts on the first frame (read inside useFrame, never during render).
  const started = useRef<number | null>(null);
  const count = () => {
    if (still) return 40;
    const now = performance.now();
    started.current ??= now;
    return STEPS[Math.floor((now - started.current) / 1000 / STEP_S) % STEPS.length];
  };
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 3.4]} fov={30} />
      {/* Low and to the left, behind "YOUR", so Ano and the button stay clear. */}
      <Cluster count={count} color={LAB.chemistry.sage} radius={0.3} position={[-0.95, -0.42, -0.6]} />
    </>
  );
}

export function DividingCells({ className }: { className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  useViewPresence(track);
  return (
    <div aria-hidden className={className}>
      <View ref={track} className="absolute inset-0">
        <Cells />
      </View>
    </div>
  );
}
