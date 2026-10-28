"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Sprite } from "three";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { glowMaterial, kitMaterial } from "../materials";
import { TextBoard, type BoardStyle } from "../TextBoard";
import type { Getter } from "./glass";

/*
 * Bench instruments for the chemistry kit (DESIGN.md §7.5, §8 "toy-like
 * rounded instruments with small screens in Martian Mono"): a floating readout
 * label, a thermometer, a hot plate and a burner. Each reads the simulator
 * through getters every frame and never sets React state per frame.
 */

/** A label that floats in the scene and follows a getter (redraws only on change). */
export function Readout({ text, style = "glass", height = 0.12, position }: { text: Getter<string>; style?: BoardStyle; height?: number; position?: [number, number, number] }) {
  const board = useMemo(() => new TextBoard(style, height, 24), [style, height]);
  useEffect(() => () => board.dispose(), [board]);
  useFrame(() => board.set(text()));
  return <primitive object={board.sprite} position={position} />;
}

// The thermometer and the hot plate are models of their own (§8.2), kept with the heat kit.
export { Thermometer3D } from "./heat/Thermometer3D";
export { HotPlate3D } from "./heat/HotPlate3D";

/** A small burner with a flame that grows with `flame` (0–1): a metal base and tube, a glowing flame sprite. */
export function Burner3D({ flame, position }: { flame: Getter<number>; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  // Heat in sand gold, with a white-hot core (DESIGN.md §8).
  const outer = useMemo(() => glowMaterial(LAB.chemistry.gold), []);
  const inner = useMemo(() => glowMaterial(P.white), []);
  const a = useRef<Sprite>(null);
  const b = useRef<Sprite>(null);
  useEffect(
    () => () => {
      outer.dispose();
      inner.dispose();
    },
    [outer, inner],
  );
  useFrame(({ clock }) => {
    const k = Math.max(0, Math.min(1, flame()));
    const flicker = 1 + Math.sin(clock.elapsedTime * 23) * 0.05 + Math.sin(clock.elapsedTime * 37) * 0.04;
    if (a.current) {
      a.current.scale.set(0.12 * k * flicker, 0.32 * k * flicker, 1);
      (a.current.material as typeof outer).opacity = k * 0.95;
    }
    if (b.current) {
      b.current.scale.set(0.06 * k, 0.14 * k, 1);
      (b.current.material as typeof inner).opacity = k * 0.9;
    }
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} material={kitMaterial("metal", tier)}>
        <cylinderGeometry args={[0.12, 0.14, 0.04, 28]} />
      </mesh>
      <mesh position={[0, 0.16, 0]} material={kitMaterial("metal", tier)}>
        <cylinderGeometry args={[0.03, 0.035, 0.26, 18]} />
      </mesh>
      <sprite ref={a} material={outer} position={[0, 0.42, 0]} />
      <sprite ref={b} material={inner} position={[0, 0.34, 0]} />
    </group>
  );
}
