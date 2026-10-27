"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { BoxGeometry, CylinderGeometry, type Group, type Mesh } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useQuality } from "@/lib/quality";
import { kitMaterial, liquidMaterial } from "../../materials";
import { PALETTE as P } from "@/lib/tokens";
import { Readout } from "../instruments";
import type { Getter } from "../glass";

/*
 * A gas syringe on a stand (DESIGN.md §7.5 kit, §8 toy-like instruments):
 * a glass barrel lying along x with its nozzle at the origin, a white
 * plunger that slides out as gas arrives, tick marks every 50 mL and a glass
 * readout above. `ml` is a getter read every frame.
 */

const L = 0.62;
const R = 0.075;
const BARREL = new CylinderGeometry(R, R, L, 32, 1, true).rotateZ(Math.PI / 2).translate(L / 2, 0, 0);
const END = new CylinderGeometry(R, R, 0.012, 32).rotateZ(Math.PI / 2);
const NOZZLE = new CylinderGeometry(0.02, 0.026, 0.07, 16).rotateZ(Math.PI / 2).translate(-0.035, 0, 0);
const ROD = new CylinderGeometry(0.012, 0.012, L, 10).rotateZ(Math.PI / 2).translate(L / 2, 0, 0);
const DISC = new CylinderGeometry(R * 0.93, R * 0.93, 0.03, 28).rotateZ(Math.PI / 2);
const GAS = new CylinderGeometry(R * 0.9, R * 0.9, 1, 24).rotateZ(Math.PI / 2).translate(0.5, 0, 0);
const TICKS = mergeGeometries(Array.from({ length: 6 }, (_, i) => new BoxGeometry(0.006, 0.004, i % 2 ? 0.03 : 0.05).translate(0.03 + (i * (L - 0.06)) / 5, R + 0.002, 0)));

export function GasSyringe3D({ ml, max = 250, position }: { ml: Getter<number>; max?: number; position: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const plunger = useRef<Group>(null);
  const gas = useRef<Mesh>(null);
  useFrame(() => {
    const travel = Math.max(0, Math.min(1, ml() / max)) * (L - 0.06);
    plunger.current?.position.set(0.03 + travel, 0, 0);
    if (gas.current) {
      gas.current.scale.set(Math.max(0.001, 0.03 + travel), 1, 1);
      gas.current.visible = travel > 0.004;
    }
  });
  return (
    <group position={position}>
      <mesh geometry={BARREL} material={kitMaterial("glass", tier)} renderOrder={2} />
      <mesh geometry={END} material={kitMaterial("glass", tier)} />
      <mesh geometry={NOZZLE} material={kitMaterial("glass", tier)} />
      <mesh geometry={TICKS} material={kitMaterial("ink", tier)} />
      <mesh ref={gas} geometry={GAS} material={liquidMaterial(P.volt[100], tier, 0.35)} />
      <group ref={plunger}>
        <mesh geometry={DISC} material={kitMaterial("rubber", tier)} />
        <mesh geometry={ROD} material={kitMaterial("plastic", tier)} />
        <mesh geometry={DISC} position={[L + 0.03, 0, 0]} scale={[1, 1.15, 1.15]} material={kitMaterial("orange", tier)} />
      </group>
      {/* The stand: a white base, two posts and orange clamps round the barrel. */}
      <RoundedBox args={[L * 0.95, 0.04, 0.3]} radius={0.015} smoothness={2} position={[L / 2, -position[1] + 0.02, 0]} material={kitMaterial("plastic", tier)} />
      {[0.12, L - 0.1].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, (-position[1] + 0.04 - R) / 2, 0]} material={kitMaterial("metal", tier)}>
            <cylinderGeometry args={[0.012, 0.012, position[1] - 0.04 - R, 10]} />
          </mesh>
          <mesh rotation={[0, Math.PI / 2, 0]} material={kitMaterial("orange", tier)}>
            <torusGeometry args={[R + 0.01, 0.012, 8, 28]} />
          </mesh>
        </group>
      ))}
      {/* Padded to a fixed width: the label's canvas must not change size once drawn. */}
      <Readout text={() => `O₂ ${String(Math.round(ml())).padStart(3, " ")} mL`} height={0.1} position={[L / 2, R + 0.14, 0]} />
    </group>
  );
}
