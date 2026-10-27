"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useQuality } from "@/lib/quality";
import { prefersReducedMotion } from "@/lib/motion";
import { studioEnvironment } from "@/components/three/studio-env";
import { AnoRig } from "./rig";
import type { AnoAction, AnoExpression, AnoPose } from "./types";

/*
 * Ano in a 3D scene (DESIGN.md §6). A thin wrapper: the rig owns the object
 * tree and moves it each frame; props only change what it aims for. Play a
 * move by passing a new `action.key`.
 */

export interface AnoProps {
  expression?: AnoExpression;
  action?: AnoAction | null;
  speaking?: boolean;
  pose?: AnoPose;
  look?: "cursor" | "camera";
  /** The view's DOM box, so the head can turn toward the cursor. */
  track?: RefObject<HTMLElement | null>;
  position?: [number, number, number];
  scale?: number;
}

export function Ano({ expression = "happy", action = null, speaking = false, pose = "stand", look = "cursor", track, position = [0, 0, 0], scale = 1 }: AnoProps) {
  const tier = useQuality((s) => s.level);
  const [rig] = useState(() => new AnoRig(tier));
  const input = useRef({ expression, speaking, pose, look });
  const reduced = useRef(false);

  useEffect(() => {
    input.current = { expression, speaking, pose, look };
  }, [expression, speaking, pose, look]);
  useEffect(() => {
    reduced.current = prefersReducedMotion();
  }, []);
  const get = useThree((s) => s.get);
  useEffect(() => rig.setTier(tier), [rig, tier]);
  useEffect(() => rig.setVisorEnvironment(studioEnvironment(get().gl)), [rig, get]);
  useEffect(() => () => rig.dispose(), [rig]);
  const move = action?.move;
  const moveKey = action?.key;
  useEffect(() => {
    // Reduced motion: no big moves, the face still changes.
    if (move && moveKey !== undefined && !reduced.current) rig.play(move);
  }, [rig, move, moveKey]);

  useFrame((state, delta) => {
    rig.update(Math.min(delta, 1 / 30), state.camera, { ...input.current, rect: track?.current?.getBoundingClientRect() ?? null }, reduced.current);
  });

  return (
    <group position={position} scale={scale}>
      <primitive object={rig.root} />
    </group>
  );
}
