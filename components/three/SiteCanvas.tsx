"use client";

import { useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor, View } from "@react-three/drei";
import { ACESFilmicToneMapping } from "three";
import { detectQuality, maxDprFor, useQuality } from "@/lib/quality";
import { debugFlags, StatsProbe } from "@/components/ui/StatsProbe";
import { markCanvasReady } from "./boot";
import { onFrameloop, setTabHidden } from "./frameloop";
import { bindPointer } from "./pointer";

/*
 * One persistent 3D canvas for the whole site (CLAUDE.md §3.7, the
 * react-three-next pattern). Every 3D thing on a page is a drei <View>: a div
 * in the normal layout whose scene is drawn into this canvas, scissored to
 * the div's rectangle. So scenes never reload between routes, and there's one
 * WebGL context and one frame loop.
 *
 * It sits fixed above page backgrounds and headlines (z-10) and below
 * floating cards, menus and dialogs (z-20 and up), with pointer events off:
 * events reach each view through its tracking div. Loaded client-only.
 */

/** Draws only when needed (components/three/frameloop.ts, DESIGN.md §9.2). */
function FrameloopSwitch() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const visibility = () => setTabHidden(document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    const off = onFrameloop((mode, clear) => {
      const s = get();
      // Nothing left on screen: wipe the last picture so it can't linger.
      if (mode === "never" && clear) {
        s.gl.setScissorTest(false);
        s.gl.clear();
      }
      s.setFrameloop(mode);
    });
    return () => {
      off();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [get]);
  return null;
}

export default function SiteCanvas() {
  const detected = useQuality((s) => s.detected);
  const level = useQuality((s) => s.level);
  const step = useQuality((s) => s.step);
  const [stats, setStats] = useState(false);

  useEffect(() => {
    bindPointer();
    void detectQuality();
    // Client-only component: the URL is safe to read after mount.
    const id = window.setTimeout(() => setStats(debugFlags().has("stats")), 0);
    return () => window.clearTimeout(id);
  }, []);

  // CSS follows the tier too (no backdrop blur on low).
  useEffect(() => {
    document.documentElement.dataset.quality = level;
  }, [level]);

  // Wait for the GPU guess: antialiasing can only be chosen when the context is made.
  if (!detected) return null;

  return (
    <div aria-hidden data-site-canvas className="pointer-events-none fixed inset-0 z-10">
      <Canvas
        eventSource={document.body}
        eventPrefix="client"
        dpr={maxDprFor(level)}
        gl={{ antialias: level !== "low", alpha: true, powerPreference: "high-performance", stencil: false }}
        camera={{ position: [0, 0, 6], fov: 30 }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.02;
          gl.setClearColor(0x000000, 0);
          requestAnimationFrame(markCanvasReady);
        }}
      >
        <PerformanceMonitor bounds={(refresh) => (refresh > 90 ? [50, 90] : [44, 58])} flipflops={4} onDecline={() => step(-1)} onIncline={() => step(1)} />
        <FrameloopSwitch />
        <View.Port />
        {stats && <StatsProbe />}
      </Canvas>
    </div>
  );
}
