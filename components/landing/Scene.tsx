"use client";

import { Suspense, useEffect, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial, PerformanceMonitor } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useQuality } from "@/lib/quality";
import { TOKENS } from "@/lib/tokens";
import { Ano3D } from "@/components/ano/Ano3D";
import { CameraRail } from "./CameraRail";
import { AnoBody, CursorBody } from "./CursorBody";
import { Dust } from "./Dust";
import { Effects } from "./Effects";
import { FloatingObjects } from "./FloatingObjects";
import { HeroExperiment } from "./HeroExperiment";
import { KineticTitle } from "./KineticTitle";
import { useLanding } from "./landing-store";
import { FLOOR_Y } from "./layout";
import { LensCursor } from "./LensCursor";
import { live } from "./live";
import { StudioLighting } from "./StudioLighting";

/*
 * The landing page's WebGL world. Loaded with dynamic(..., { ssr: false }).
 * Quality "low" drops the lens cursor, the reflective floor, edge chromatic
 * aberration and MSAA, and thins out objects and dust (CLAUDE.md §9).
 */

// ?debug=stats exposes draw calls on window.__anomalyStats (CLAUDE.md §9).
const DEBUG = new Set((new URLSearchParams(window.location.search).get("debug") ?? "").split(","));

export default function Scene({ eventSource }: { eventSource: RefObject<HTMLElement | null> }) {
  const quality = useQuality((s) => s.level);
  const dropToLow = useQuality((s) => s.dropToLow);
  const lensEnabled = useLanding((s) => s.lensEnabled);
  const high = quality === "high";

  // Resolution adapts to the machine: start sharp, step down smoothly if the
  // frame rate dips, and only fall back to "low" if that isn't enough.
  // Capped at 1.5 (CLAUDE.md §9 performance budget).
  const maxDpr = Math.min(window.devicePixelRatio || 1, high ? 1.5 : 1.25);
  const [dpr, setDpr] = useState(maxDpr);

  return (
    <Canvas
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
      dpr={Math.min(dpr, maxDpr)}
      camera={{ fov: 35, near: 0.1, far: 80, position: [0, 0.35, 7.2] }}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        // Glass refraction at half resolution: roughness blurs it anyway, and
        // it halves the cost of the transmission pass.
        gl.transmissionResolutionScale = 0.5;
      }}
    >
      <color attach="background" args={[TOKENS.void]} />
      <fog attach="fog" args={[TOKENS.void, 12, 32]} />
      <PerformanceMonitor
        factor={1}
        step={0.2}
        bounds={() => [50, 1000]}
        flipflops={4}
        onChange={({ factor }) => setDpr(Math.round((1 + factor * (maxDpr - 1)) * 10) / 10)}
        onFallback={dropToLow}
      />

      <LenisDriver />
      <StudioLighting />
      <CameraRail />
      {DEBUG.has("stats") && <StatsProbe />}

      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]}>
          <HeroExperiment />
          <FloatingObjects count={high ? 30 : 16} />
          <CursorBody />
          <AnoBody />
        </Physics>
        <Floor high={high} />
        <KineticTitle />
        <Ano3D />
        <Dust count={high ? 7000 : 2500} />
        {high && lensEnabled && <LensCursor />}
        <ReadySignal />
      </Suspense>

      <Effects high={high} />
    </Canvas>
  );
}

function Floor({ high }: { high: boolean }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, -4]}>
      <planeGeometry args={[80, 80]} />
      {high ? (
        <MeshReflectorMaterial
          resolution={512}
          blur={[300, 90]}
          mixBlur={0.9}
          mixStrength={30}
          mixContrast={1.15}
          roughness={1}
          metalness={0.5}
          depthScale={1.2}
          minDepthThreshold={0.35}
          maxDepthThreshold={1.5}
          envMapIntensity={0.15}
          color={TOKENS.void}
        />
      ) : (
        <meshStandardMaterial color={TOKENS.void} roughness={0.55} metalness={0.2} envMapIntensity={0.25} />
      )}
    </mesh>
  );
}

/** Compiles every shader up front, waits two frames, then lifts the preloader. */
function ReadySignal() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const setSceneReady = useLanding((s) => s.setSceneReady);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        raf = requestAnimationFrame(() => {
          raf = requestAnimationFrame(() => setSceneReady());
        });
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [gl, scene, camera, setSceneReady]);

  return null;
}

/** Lenis runs on the R3F frame loop, before the camera reads the scroll. */
function LenisDriver() {
  useFrame(() => {
    live.lenis?.raf(performance.now());
  }, -1);
  return null;
}

/**
 * ?debug=stats: draw calls and triangles for the whole frame (every pass),
 * exposed on window.__anomalyStats for automated checks.
 */
function StatsProbe() {
  useFrame((state) => {
    const info = state.gl.info;
    info.autoReset = false;
    (window as unknown as { __anomalyStats?: { calls: number; triangles: number } }).__anomalyStats = {
      calls: info.render.calls,
      triangles: info.render.triangles,
    };
    info.reset();
  }, 2);
  return null;
}
