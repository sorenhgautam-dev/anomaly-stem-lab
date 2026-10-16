"use client";

import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type { ShaderMaterial } from "three";
import { useLab } from "@/lib/store";
import { room } from "./room-state";

/*
 * One place that feeds time, run power and the verdict pulses to every room
 * shader. Components register their materials with usePulse(); PulseDriver
 * writes the uniforms once per frame (no React state per frame).
 */

const targets = new Set<ShaderMaterial>();

/** Keep a material's uTime / uGold / uAnomaly / uPower / uRunAge / uLanes / uPixelRatio in step with the room. */
export function usePulse(...materials: ShaderMaterial[]): void {
  useEffect(() => {
    for (const m of materials) targets.add(m);
    return () => {
      for (const m of materials) targets.delete(m);
    };
    // The materials are memoised by their owners; a new one means re-register.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, materials);
}

/** Smoothed 0..1: how "on" the bench is (a run playing = full power). */
export const power = { value: 0 };
/** Smoothed 0..1: the robot stage's neon lane lines on the mat. */
const lanes = { value: 0 };

/** With reduced motion the room skips the gold sweep and coral flicker; the HUD still shows the verdict. */
export function PulseDriver({ reducedMotion }: { reducedMotion: boolean }) {
  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    room.gold = Math.max(0, room.gold - dt * 0.5);
    room.anomaly = Math.max(0, room.anomaly - dt * 0.85);
    const { phase, def } = useLab.getState();
    lanes.value += ((def?.stage === "robot" ? 1 : 0) - lanes.value) * (1 - Math.exp(-dt * 3));
    const goal = phase === "running" ? 1 : phase === "result" ? 0.35 : 0;
    power.value += (goal - power.value) * (1 - Math.exp(-dt * (goal > power.value ? 6 : 1.5)));
    const t = state.clock.elapsedTime;
    const runAge = performance.now() / 1000 - room.runAt;
    // Ease the pulses so they bloom in fast and fade out slowly.
    const gold = room.gold > 0 && !reducedMotion ? Math.sin(room.gold * Math.PI * 0.5) : 0;
    const anomaly = reducedMotion ? 0 : room.anomaly * room.anomaly;
    for (const m of targets) {
      const u = m.uniforms;
      u.uTime.value = t;
      if (u.uGold) u.uGold.value = gold;
      if (u.uAnomaly) u.uAnomaly.value = anomaly;
      if (u.uPower) u.uPower.value = power.value;
      if (u.uRunAge) u.uRunAge.value = runAge;
      if (u.uLanes) u.uLanes.value = lanes.value;
      if (u.uPixelRatio) u.uPixelRatio.value = state.viewport.dpr;
    }
  }, -0.5);
  return null;
}
