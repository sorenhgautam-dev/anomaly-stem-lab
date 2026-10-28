"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace } from "three";
import type { LabId } from "@/engine/types";
import { LOOK } from "./look";

/*
 * The lab's room (DESIGN.md §8): one continuous studio in the lab's colour. The
 * backdrop is a screen-space gradient (so it has no seams or horizon) that
 * deepens toward the floor, and the floor is a disc in the floor colour that
 * fades out into it, so floor and wall read as one curved sweep.
 */

/** Top to bottom: Chemistry's teal deepening to its floor; Robotics' graphite, lifted behind the bench. */
function backdrop(lab: LabId) {
  const look = LOOK[lab];
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  const stops: [number, string][] =
    lab === "chemistry"
      ? [
          [0, look.wall],
          [0.55, look.wall],
          [1, look.floor],
        ]
      : [
          [0, look.floor],
          [0.5, look.wall],
          [1, look.floor],
        ];
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** The floor: the lab's floor colour at the centre, fading out at the edge into the backdrop. */
function floorTexture(lab: LabId) {
  const floor = LOOK[lab].floor;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, `${floor}ff`);
  g.addColorStop(0.6, `${floor}ee`);
  g.addColorStop(1, `${floor}00`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function Room({ lab }: { lab: LabId }) {
  const get = useThree((s) => s.get);
  const floor = useMemo(() => floorTexture(lab), [lab]);
  useEffect(() => () => floor.dispose(), [floor]);
  useEffect(() => {
    // The view's own scene gets the backdrop (drawn behind everything in its rectangle).
    const scene = get().scene;
    const bg = backdrop(lab);
    scene.background = bg;
    return () => {
      scene.background = null;
      bg.dispose();
    };
  }, [get, lab]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.28, 0]}>
      <circleGeometry args={[11, 64]} />
      <meshBasicMaterial map={floor} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
