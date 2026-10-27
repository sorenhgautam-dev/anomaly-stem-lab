"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, type Group } from "three";
import { playback } from "@/components/lab/playback";
import { useQuality } from "@/lib/quality";
import { kitMaterial } from "../materials";
import { Lead } from "./parts3d";
import { BOARD_TOP } from "./space";

/*
 * Moving parts (DESIGN.md §7.5 kit): a motor whose fan spins with the
 * current, and a buzzer that shivers when it sounds.
 */

const CAN = new CylinderGeometry(0.085, 0.085, 0.2, 28).rotateZ(Math.PI / 2);
const SHAFT = new CylinderGeometry(0.012, 0.012, 0.12, 10).rotateZ(Math.PI / 2);
const DISC = new CylinderGeometry(0.11, 0.11, 0.06, 32);

export function Motor3D({ half, current, powered }: { half: number; current: number; powered: boolean }) {
  const tier = useQuality((s) => s.level);
  const fan = useRef<Group>(null);
  useFrame((_, dt) => {
    const k = powered ? Math.min(1, playback.t / 0.9) : 0;
    if (fan.current) fan.current.rotation.x += Math.min(40, Math.abs(current) * 120) * k * Math.min(dt, 1 / 30);
  });
  const y = BOARD_TOP + 0.11;
  return (
    <group>
      <mesh geometry={CAN} position={[-0.02, y, 0]} material={kitMaterial("metal", tier)} />
      <mesh geometry={SHAFT} position={[0.12, y, 0]} material={kitMaterial("metal", tier)} />
      <group ref={fan} position={[0.18, y, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[(i * Math.PI * 2) / 3, 0, 0]} position={[0, 0, 0]} material={kitMaterial("orange", tier)}>
            <boxGeometry args={[0.012, 0.2, 0.05]} />
          </mesh>
        ))}
      </group>
      <Lead x0={-half} x1={-0.12} y1={y - 0.03} />
      <Lead x0={half} x1={-0.12} y1={y + 0.03} lift={0.14} />
    </group>
  );
}

export function Buzzer3D({ half, current, powered }: { half: number; current: number; powered: boolean }) {
  const tier = useQuality((s) => s.level);
  const body = useRef<Group>(null);
  useFrame((state) => {
    const on = powered && Math.abs(current) > 0.001 && playback.t > 0.4;
    if (body.current) body.current.position.x = on ? Math.sin(state.clock.elapsedTime * 90) * 0.004 : 0;
  });
  return (
    <group>
      <group ref={body}>
        <mesh geometry={DISC} position={[0, BOARD_TOP + 0.06, 0]} material={kitMaterial("ink", tier)} />
        <mesh position={[0, BOARD_TOP + 0.092, 0]} material={kitMaterial("metal", tier)}>
          <cylinderGeometry args={[0.02, 0.02, 0.006, 16]} />
        </mesh>
      </group>
      <Lead x0={-half} x1={-0.06} y1={BOARD_TOP + 0.04} />
      <Lead x0={half} x1={0.06} y1={BOARD_TOP + 0.04} />
    </group>
  );
}
