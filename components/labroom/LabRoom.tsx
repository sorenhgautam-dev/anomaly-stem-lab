"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { AgXToneMapping } from "three";
import { isLab } from "@/lib/content";
import { cn } from "@/lib/cn";
import { detectInitialQuality, useQuality } from "@/lib/quality";
import { RAMP } from "@/lib/tokens";
import { ShaderWarmup } from "@/components/ui/ShaderWarmup";
import { debugFlags, StatsProbe } from "@/components/ui/StatsProbe";
import { CameraRig } from "./CameraRig";
import { ChemistryRoom } from "./chemistry/ChemistryRoom";
import { PulseDriver } from "./pulses";
import { RoboticsRoom } from "./robotics/RoboticsRoom";
import { useRoomReady } from "./room-state";
import { RoomEffects } from "./RoomEffects";
import { RoomLighting } from "./RoomLighting";

/*
 * The 3D laboratory behind the lab HUD (CLAUDE.md §3.6.2, hybrid approach):
 * one room per lab, one canvas that lives across the map and every
 * experiment of that lab, so moving between them is a camera move, never a
 * reload (§3.7). Loaded with dynamic(..., { ssr: false }).
 */

const DEBUG = debugFlags();

export default function LabRoom() {
  const pathname = usePathname();
  const segment = pathname.split("/")[2] ?? "";
  const lab = isLab(segment) ? segment : "chemistry";
  // /labs/[lab]/[level] is the map: the room sits back, dimmed, behind it.
  const onMap = pathname.split("/").filter(Boolean).length < 4;
  const quality = useQuality((s) => s.level);
  const dropToLow = useQuality((s) => s.dropToLow);
  const ready = useRoomReady((s) => s.ready);
  const high = quality === "high";
  // Client-only component (ssr: false), so reading the media query here is safe.
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const q = useQuality.getState();
    if (!q.locked && !q.autoDropped) {
      const initial = detectInitialQuality();
      q.setLevel(initial.level, initial.locked);
    }
    return () => useRoomReady.getState().setReady(false);
  }, []);

  // The room is a backdrop: resolution matters less than in the hero, so it
  // starts at 1.25× and steps down if the frame rate dips (CLAUDE.md §9).
  const maxDpr = Math.min(window.devicePixelRatio || 1, high ? 1.25 : 1);
  const [dpr, setDpr] = useState(maxDpr);

  return (
    <div aria-hidden className={cn("pointer-events-none fixed inset-0 transition-opacity duration-700 ease-lab [view-transition-name:lab-room]", ready ? "opacity-100" : "opacity-0")}>
      <Canvas
        dpr={Math.min(dpr, maxDpr)}
        camera={{ fov: 30, near: 0.05, far: 40, position: [0, 2, 8] }}
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = AgXToneMapping;
        }}
      >
        <color attach="background" args={[RAMP.depth[950]]} />
        <fog attach="fog" args={[RAMP.depth[950], 6, 15]} />
        <PerformanceMonitor
          factor={1}
          step={0.25}
          bounds={() => [48, 1000]}
          flipflops={3}
          onChange={({ factor }) => setDpr(Math.round((0.75 + factor * (maxDpr - 0.75)) * 100) / 100)}
          onFallback={dropToLow}
        />
        <CameraRig lab={lab} reducedMotion={reduced} />
        <PulseDriver reducedMotion={reduced} />
        <Suspense fallback={null}>
          <RoomLighting lab={lab} />
          {lab === "chemistry" ? <ChemistryRoom high={high} /> : <RoboticsRoom high={high} />}
          <ShaderWarmup onReady={() => useRoomReady.getState().setReady(true)} />
        </Suspense>
        {high && <RoomEffects />}
        {DEBUG.has("stats") && <StatsProbe />}
      </Canvas>
      <div className={cn("absolute inset-0 bg-depth-950 transition-opacity duration-1000 ease-lab", onMap ? "opacity-55" : "opacity-0")} />
    </div>
  );
}
