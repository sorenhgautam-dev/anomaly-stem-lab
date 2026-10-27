"use client";

import { RoundedBox } from "@react-three/drei";
import { BoxGeometry, CylinderGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useQuality } from "@/lib/quality";
import { kitMaterial } from "../materials";

/*
 * A small DC gear motor for the robot kit (DESIGN.md §7.5 "motor"): a metal
 * can on a white mount, an orange end cap with two terminal tabs at the back
 * (where the brushes spark), and a shaft out of the front. The shaft runs
 * along +Z from the origin; the can sits behind it.
 */

export const MOTOR_CAN = { radius: 0.1, length: 0.32 };

const CAN = new CylinderGeometry(MOTOR_CAN.radius, MOTOR_CAN.radius, MOTOR_CAN.length, 32).rotateX(Math.PI / 2);
const CAP = new CylinderGeometry(MOTOR_CAN.radius * 0.82, MOTOR_CAN.radius * 0.9, 0.04, 28).rotateX(Math.PI / 2);
const BOSS = new CylinderGeometry(0.035, 0.035, 0.03, 18).rotateX(Math.PI / 2);
const BACK = -MOTOR_CAN.length - 0.02;
/** The two terminal tabs, merged into one mesh. */
const TABS = mergeGeometries([-1, 1].map((s) => new BoxGeometry(0.018, 0.04, 0.03).translate(s * 0.04, 0.03, BACK - 0.03)));

/** `mount`: how far the white mount reaches down below the shaft (0 for none). */
export function MotorCan3D({ position, shaft = 0.12, mount = 0 }: { position?: [number, number, number]; shaft?: number; mount?: number }) {
  const tier = useQuality((s) => s.level);
  return (
    <group position={position}>
      <mesh geometry={CAN} position={[0, 0, -MOTOR_CAN.length / 2 - 0.015]} material={kitMaterial("metal", tier)} />
      <mesh geometry={CAP} position={[0, 0, BACK]} material={kitMaterial("orange", tier)} />
      <mesh geometry={BOSS} position={[0, 0, -0.005]} material={kitMaterial("plastic", tier)} />
      <mesh position={[0, 0, shaft / 2]} rotation={[Math.PI / 2, 0, 0]} material={kitMaterial("metal", tier)}>
        <cylinderGeometry args={[0.012, 0.012, shaft, 12]} />
      </mesh>
      <mesh geometry={TABS} material={kitMaterial("copper", tier)} />
      {mount > 0 && <RoundedBox args={[MOTOR_CAN.radius * 1.9, mount, MOTOR_CAN.length * 0.7]} radius={0.02} smoothness={2} position={[0, -mount / 2, -MOTOR_CAN.length / 2 - 0.015]} material={kitMaterial("plastic", tier)} />}
    </group>
  );
}

/** Where the brushes are (the back of the can), relative to the shaft's origin. */
export const BRUSHES: [number, number, number] = [0, 0.04, -MOTOR_CAN.length - 0.06];
