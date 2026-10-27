"use client";

import { useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { TimelineFrame } from "@/engine/types";
import type { Getter } from "../glass";
import { ChartBoard, type ChartSpec } from "./chart";

/*
 * The floating live graph (chart.ts) as a scene object: pass the run's real
 * and ghost timelines (they change only between runs) and getters for the
 * playback time and the value right now.
 */

export function HeatChart({ spec, height = 0.62, real, ghost, t, now, position }: { spec: ChartSpec; height?: number; real: TimelineFrame[] | null; ghost: TimelineFrame[] | null; t: Getter<number>; now: Getter<number>; position?: [number, number, number] }) {
  const [board] = useState(() => new ChartBoard(spec, height));
  useEffect(() => () => board.dispose(), [board]);
  useFrame(() => board.update(real, ghost, t(), now()));
  return <primitive object={board.sprite} position={position} />;
}
