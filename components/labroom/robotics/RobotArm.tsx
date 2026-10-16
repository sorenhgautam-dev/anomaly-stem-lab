"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { roomGeos } from "../geometry";
import { roomMats } from "../materials";
import { power } from "../pulses";

/*
 * A small robot arm idling at the back of the workbench: it sweeps, reaches
 * and opens its gripper on slow, out-of-step sine waves, and gets busier
 * while a run plays. Pure ambient life (CLAUDE.md §3.6.3).
 */

export function RobotArm({ at, turn = 0 }: { at: [number, number, number]; turn?: number }) {
  const g = roomGeos();
  const m = roomMats();
  const turret = useRef<Group>(null);
  const shoulder = useRef<Group>(null);
  const elbow = useRef<Group>(null);
  const fingers = useRef<(Group | null)[]>([]);
  const clock = useRef(0);

  useFrame((_, delta) => {
    clock.current += Math.min(delta, 1 / 20) * (1 + power.value * 1.6);
    const t = clock.current;
    if (turret.current) turret.current.rotation.y = Math.sin(t * 0.31) * 0.7;
    if (shoulder.current) shoulder.current.rotation.z = -0.35 + Math.sin(t * 0.47) * 0.28;
    if (elbow.current) elbow.current.rotation.z = 1.25 + Math.sin(t * 0.61 + 1.2) * 0.35;
    const open = 0.012 + (Math.sin(t * 0.9) * 0.5 + 0.5) * 0.018;
    fingers.current.forEach((f, i) => f?.position.set(i === 0 ? -open : open, 0, 0));
  });

  return (
    <group position={at} rotation-y={turn}>
      <mesh geometry={g.disc} material={m.metal} position={[0, 0.02, 0]} scale={[0.2, 0.04, 0.2]} />
      <group ref={turret} position={[0, 0.04, 0]}>
        <mesh geometry={g.disc} material={m.chrome} position={[0, 0.05, 0]} scale={[0.12, 0.1, 0.12]} />
        <group ref={shoulder} position={[0, 0.11, 0]}>
          <mesh geometry={g.sphere} material={m.plastic} scale={0.09} />
          <mesh geometry={g.rounded} material={m.chrome} position={[0, 0.16, 0]} scale={[0.055, 0.32, 0.055]} />
          <group ref={elbow} position={[0, 0.32, 0]}>
            <mesh geometry={g.sphere} material={m.plastic} scale={0.07} />
            <mesh geometry={g.rounded} material={m.chrome} position={[0, 0.13, 0]} scale={[0.045, 0.26, 0.045]} />
            <group position={[0, 0.27, 0]}>
              <mesh geometry={g.box} material={m.metal} scale={[0.07, 0.025, 0.035]} />
              {[0, 1].map((i) => (
                <group
                  key={i}
                  ref={(el) => {
                    fingers.current[i] = el;
                  }}
                >
                  <mesh geometry={g.box} material={m.metal} position={[0, 0.03, 0]} scale={[0.008, 0.05, 0.025]} />
                </group>
              ))}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
