"use client";

import { RoundedBox } from "@react-three/drei";
import { CylinderGeometry, type BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { latheGeometry, mergeParts } from "../detail";
import { kitMaterial } from "../materials";

/*
 * A small DC gear motor for the robot kit (DESIGN.md §7.5 "motor", §8.2): a
 * lathed steel can with a rolled front edge and a crimped ring, a black end
 * bell at the back with two copper terminal tabs (where the brushes spark),
 * a steel bearing boss and shaft out of the front, on a black mount. The
 * shaft runs along +Z from the origin; the can sits behind it.
 */

export const MOTOR_CAN = { radius: 0.1, length: 0.32 };

const R = MOTOR_CAN.radius;
const L = MOTOR_CAN.length;
const BACK = -L - 0.02;

let parts: { can: BufferGeometry; bell: BufferGeometry; steel: BufferGeometry; tabs: BufferGeometry } | null = null;
/** Lathed along Y, then turned so +Y runs back along −Z. */
function motorShapes() {
  if (parts) return parts;
  const back = (g: BufferGeometry) => g.rotateX(-Math.PI / 2);
  const can = back(latheGeometry([[0.03, 0], [R - 0.012, 0], [R - 0.003, 0.004], [R, 0.014], [R, L * 0.62], [R - 0.005, L * 0.64], [R, L * 0.66], [R, L - 0.006], [R - 0.006, L]], 48)).translate(0, 0, -0.015);
  const bell = back(latheGeometry([[R * 0.95, 0], [R * 0.95, 0.012], [R * 0.9, 0.03], [R * 0.72, 0.042], [0.001, 0.044]], 40)).translate(0, 0, BACK + 0.005);
  const steel = mergeParts([back(latheGeometry([[0.001, -0.018], [0.03, -0.018], [0.036, -0.012], [0.036, 0]], 24)).translate(0, 0, -0.015)]);
  const tabs = mergeParts([-1, 1].map((s) => new RoundedBoxGeometry(0.018, 0.045, 0.034, 1, 0.004).translate(s * 0.04, 0.03, BACK - 0.05)));
  parts = { can, bell, steel, tabs };
  return parts;
}

/** `mount`: how far the black mount reaches down below the shaft (0 for none). */
export function MotorCan3D({ position, shaft = 0.12, mount = 0 }: { position?: [number, number, number]; shaft?: number; mount?: number }) {
  const tier = useQuality((s) => s.level);
  const g = motorShapes();
  return (
    <group position={position}>
      <mesh geometry={g.can} material={kitMaterial("steel", tier)} />
      <mesh geometry={g.bell} material={kitMaterial("black", tier)} />
      <mesh geometry={g.steel} material={kitMaterial("steel", tier)} />
      <mesh position={[0, 0, shaft / 2]} rotation={[Math.PI / 2, 0, 0]} geometry={SHAFT} scale={[1, shaft, 1]} material={kitMaterial("steel", tier)} />
      <mesh geometry={g.tabs} material={kitMaterial("copper", tier)} />
      {mount > 0 && <RoundedBox args={[R * 1.9, mount, L * 0.7]} radius={Math.min(0.02, mount * 0.45)} smoothness={3} position={[0, -mount / 2, -L / 2 - 0.015]} material={kitMaterial("matte", tier, LAB.robotics.trim)} />}
    </group>
  );
}

/** The shaft, one unit long (scaled to length). */
const SHAFT = new CylinderGeometry(0.012, 0.012, 1, 12);

/** Where the brushes are (the back of the can), relative to the shaft's origin. */
export const BRUSHES: [number, number, number] = [0, 0.04, -MOTOR_CAN.length - 0.06];
