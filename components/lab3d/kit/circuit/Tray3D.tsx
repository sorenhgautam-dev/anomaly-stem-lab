"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type { Group } from "three";
import type { CircuitPartKind } from "@/engine/types";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { softClick, resumeAudio } from "@/lib/sound";
import { hoverCursor } from "../../lab-state";
import { kitMaterial } from "../materials";
import { IDLE, PartModel } from "./PartModel";
import { TRAY_AT } from "./Slot3D";

/*
 * The parts tray in front of the board (DESIGN.md §8.1 "Build"): the parts
 * this experiment offers, small. Click one to pick it up (it lifts and
 * glows), then click a glowing outline to drop it in. The HUD's tray does
 * the same for keyboards and screen readers.
 */

const DEFAULTS: Record<CircuitPartKind, Record<string, number | boolean>> = { battery: { volts: 3 }, wire: {}, switch: { closed: true }, resistor: { ohms: 220 }, bulb: { ohms: 12 }, led: {}, motor: {}, buzzer: {} };

function TrayItem({ kind, x, armed, disabled, onArm }: { kind: CircuitPartKind; x: number; armed: boolean; disabled: boolean; onArm: () => void }) {
  const g = useRef<Group>(null);
  useFrame((state, dt) => {
    if (!g.current) return;
    const lift = armed ? 0.16 + Math.sin(state.clock.elapsedTime * 4) * 0.015 : 0;
    g.current.position.y += (lift - g.current.position.y) * Math.min(1, dt * 12);
    g.current.rotation.y += ((armed ? 0.4 : 0) - g.current.rotation.y) * Math.min(1, dt * 8);
  });
  return (
    <group position={[x, 0.07, 0]}>
      <group ref={g} scale={0.75}>
        <PartModel kind={kind} props={DEFAULTS[kind]} half={0.2} state={IDLE} ghost={null} powered={false} />
      </group>
      {armed && (
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.22, 32]} />
          <meshBasicMaterial color={LAB.robotics.gold} transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}
      <mesh
        position={[0, 0.15, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          resumeAudio();
          softClick();
          onArm();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!disabled) hoverCursor(true);
        }}
        onPointerOut={() => hoverCursor(false)}
      >
        <boxGeometry args={[0.4, 0.34, 0.34]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}

export function Tray3D({ parts, armed, disabled, onArm }: { parts: CircuitPartKind[]; armed: CircuitPartKind | null; disabled: boolean; onArm: (kind: CircuitPartKind | null) => void }) {
  const tier = useQuality((s) => s.level);
  const width = Math.max(0.9, parts.length * 0.5 + 0.2);
  return (
    <group position={[TRAY_AT.x, 0, TRAY_AT.z]}>
      <RoundedBox args={[width, 0.07, 0.5]} radius={0.03} position={[0, 0.035, 0]} material={kitMaterial("matte", tier, LAB.robotics.trim)} />
      {parts.map((kind, i) => (
        <TrayItem key={kind} kind={kind} x={(i - (parts.length - 1) / 2) * 0.5} armed={armed === kind} disabled={disabled} onArm={() => onArm(armed === kind ? null : kind)} />
      ))}
    </group>
  );
}
