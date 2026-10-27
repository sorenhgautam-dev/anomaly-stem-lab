"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Color, CylinderGeometry, type Mesh, type MeshStandardMaterial, type Sprite } from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { glowMaterial, kitMaterial, ownMaterial } from "../materials";
import { TextBoard, type BoardStyle } from "../TextBoard";
import type { Getter } from "./glass";

/*
 * Bench instruments for the chemistry kit (DESIGN.md §7.5, §8 "toy-like
 * rounded instruments with small screens in Geist Mono"): a floating readout
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

const STEM = new CylinderGeometry(0.035, 0.035, 1, 20, 1, true).translate(0, 0.5, 0);
const BULB = new CylinderGeometry(0.05, 0.05, 0.08, 20).translate(0, 0.04, 0);
const COLUMN = new CylinderGeometry(0.016, 0.016, 1, 12).translate(0, 0.5, 0);

/**
 * A glass thermometer: the red column rises with the reading between `min`
 * and `max`, a small LCD label shows the number, and after a wrong run a
 * dashed ghost label shows the student's predicted temperature.
 */
export function Thermometer3D({ celsius, ghost = null, min = 0, max = 100, height = 0.8, unit = "°C", position }: { celsius: Getter<number>; ghost?: number | null; min?: number; max?: number; height?: number; unit?: string; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const column = useRef<Mesh>(null);
  const red = useMemo(() => ownMaterial(P.flame[500], tier, { emissive: P.flame[400] }), [tier]);
  const ghostLabel = useMemo(() => new TextBoard("ghost", 0.1, 22), []);
  useEffect(() => {
    if (ghost !== null) ghostLabel.set(`Your idea: ${Math.round(ghost)} ${unit}`);
  }, [ghost, ghostLabel, unit]);
  useEffect(() => () => ghostLabel.dispose(), [ghostLabel]);
  useFrame(() => {
    const k = Math.max(0.02, Math.min(1, (celsius() - min) / (max - min)));
    column.current?.scale.set(1, k * (height - 0.1), 1);
  });
  return (
    <group position={position}>
      <mesh geometry={BULB} material={red} />
      <mesh ref={column} geometry={COLUMN} material={red} position={[0, 0.06, 0]} />
      <mesh geometry={STEM} material={kitMaterial("glass", tier)} scale={[1, height, 1]} />
      <mesh position={[0, height, 0]} material={kitMaterial("plastic", tier)}>
        <sphereGeometry args={[0.04, 16, 10]} />
      </mesh>
      <Readout text={() => `${celsius().toFixed(1)} ${unit}`} style="screen" height={0.09} position={[0, height + 0.14, 0]} />
      {ghost !== null && <primitive object={ghostLabel.sprite} position={[0, height + 0.3, 0]} />}
    </group>
  );
}

const COLD = new Color(P.ink[700]);
const HOT = new Color(P.flame[500]);

/** A hot plate: a white body, a ceramic top that glows from dark to hot with `power` (0–1), and a dial. */
export function HotPlate3D({ power, size = 0.7, position, children }: { power: Getter<number>; size?: number; position?: [number, number, number]; children?: React.ReactNode }) {
  const tier = useQuality((s) => s.level);
  const top = useRef<Mesh>(null);
  const dial = useRef<Mesh>(null);
  const ceramic = useMemo(() => ownMaterial(P.ink[700], tier), [tier]);
  useFrame(() => {
    const k = Math.max(0, Math.min(1, power()));
    const m = top.current?.material as MeshStandardMaterial | undefined;
    if (m) {
      m.color.copy(COLD).lerp(HOT, k * 0.75);
      m.emissive.copy(HOT).multiplyScalar(k * 0.55);
    }
    if (dial.current) dial.current.rotation.z = -k * 4;
  });
  return (
    <group position={position}>
      <RoundedBox args={[size, 0.12, size]} radius={0.04} smoothness={3} position={[0, 0.06, 0]} material={kitMaterial("plastic", tier)} />
      <mesh ref={top} position={[0, 0.125, 0]} material={ceramic}>
        <cylinderGeometry args={[size * 0.4, size * 0.4, 0.012, 40]} />
      </mesh>
      <mesh ref={dial} position={[size * 0.32, 0.06, size / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]} material={kitMaterial("orange", tier)}>
        <cylinderGeometry args={[0.04, 0.04, 0.03, 18]} />
      </mesh>
      <group position={[0, 0.13, 0]}>{children}</group>
    </group>
  );
}

/** A small burner with a flame that grows with `flame` (0–1): a metal base and tube, a glowing flame sprite. */
export function Burner3D({ flame, position }: { flame: Getter<number>; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const outer = useMemo(() => glowMaterial(P.apricot[400]), []);
  const inner = useMemo(() => glowMaterial(P.volt[400]), []);
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
