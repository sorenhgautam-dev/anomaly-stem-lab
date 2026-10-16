"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

/*
 * ?debug=stats (CLAUDE.md §9): draw calls and triangles for the whole frame
 * (every pass) and a smoothed frame rate, exposed on window.__anomalyStats
 * for automated checks. Mount inside any <Canvas>.
 */

export function debugFlags(): Set<string> {
  return new Set((new URLSearchParams(window.location.search).get("debug") ?? "").split(","));
}

export function StatsProbe() {
  const fps = useRef(60);
  // Runs first in each frame and reads what the previous frame drew. A
  // negative priority: a positive one would take over rendering in R3F.
  useFrame((state, delta) => {
    const info = state.gl.info;
    info.autoReset = false;
    if (delta > 0) fps.current += (1 / delta - fps.current) * 0.05;
    (window as unknown as { __anomalyStats?: { calls: number; triangles: number; fps: number } }).__anomalyStats = {
      calls: info.render.calls,
      triangles: info.render.triangles,
      fps: Math.round(fps.current),
    };
    info.reset();
  }, -100);
  return null;
}
