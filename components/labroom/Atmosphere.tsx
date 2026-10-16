"use client";

import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry, Color } from "three";
import { mulberry32 } from "@/components/landing/random";
import { roomGeos } from "./geometry";
import { usePulse } from "./pulses";
import { beamMaterial, dustMaterial, statusLightMaterial } from "./shaders/light";

/*
 * Atmosphere shared by both rooms: light beams from the ceiling, dust
 * drifting through them, and blinking status lights on the equipment.
 */

export interface BeamSpec {
  /** Where the beam starts (at the ceiling). */
  at: [number, number, number];
  length: number;
  /** Radius at the bottom. */
  spread: number;
  /** Lean, in radians, around x and z. */
  tilt?: [number, number];
  color: string;
  intensity?: number;
}

export function Beams({ beams }: { beams: BeamSpec[] }) {
  const materials = useMemo(() => beams.map((b) => beamMaterial(b.color, b.intensity)), [beams]);
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
  usePulse(...materials);
  const geo = roomGeos().beam;
  return (
    <group>
      {beams.map((b, i) => (
        <mesh key={i} geometry={geo} material={materials[i]} position={b.at} rotation={[b.tilt?.[0] ?? 0, 0, b.tilt?.[1] ?? 0]} scale={[b.spread, b.length, b.spread]} renderOrder={2} />
      ))}
    </group>
  );
}

/** Dust motes filling a box, drifting slowly (all motion is in the shader). */
export function RoomDust({ count, box, colors }: { count: number; box: [[number, number], [number, number], [number, number]]; colors: string[] }) {
  const geometry = useMemo(() => {
    const rand = mulberry32(7);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const col = new Float32Array(count * 3);
    const palette = colors.map((c) => new Color(c));
    for (let i = 0; i < count; i++) {
      for (let a = 0; a < 3; a++) pos[i * 3 + a] = box[a][0] + rand() * (box[a][1] - box[a][0]);
      seed[i] = rand();
      const c = palette[i % palette.length];
      const boost = rand() > 0.96 ? 2.4 : 0.7;
      col[i * 3] = c.r * boost;
      col[i * 3 + 1] = c.g * boost;
      col[i * 3 + 2] = c.b * boost;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new BufferAttribute(seed, 1));
    g.setAttribute("aColor", new BufferAttribute(col, 3));
    return g;
  }, [count, box, colors]);
  const material = useMemo(() => dustMaterial(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  usePulse(material);
  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={3} />;
}

export interface LightSpec {
  at: [number, number, number];
  color: string;
  /** Blinks per second; 0 = breathe slowly instead. */
  rate: number;
}

/** Tiny LEDs on equipment. They blink faster while a run plays. */
export function StatusLights({ lights }: { lights: LightSpec[] }) {
  const geometry = useMemo(() => {
    const rand = mulberry32(11);
    const pos = new Float32Array(lights.length * 3);
    const col = new Float32Array(lights.length * 3);
    const rate = new Float32Array(lights.length);
    const phase = new Float32Array(lights.length);
    lights.forEach((l, i) => {
      pos.set(l.at, i * 3);
      const c = new Color(l.color);
      col.set([c.r, c.g, c.b], i * 3);
      rate[i] = l.rate;
      phase[i] = rand();
    });
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aColor", new BufferAttribute(col, 3));
    g.setAttribute("aRate", new BufferAttribute(rate, 1));
    g.setAttribute("aPhase", new BufferAttribute(phase, 1));
    return g;
  }, [lights]);
  const material = useMemo(() => statusLightMaterial(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  usePulse(material);
  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={3} />;
}
