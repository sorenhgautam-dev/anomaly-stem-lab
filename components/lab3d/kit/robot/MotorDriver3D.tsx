"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { kitMaterial, ownMaterial } from "../materials";
import type { Getter } from "../chem/glass";

/*
 * A motor driver board (DESIGN.md §7.5 kit): the switch the PWM controller
 * flicks on and off. An ink board with its driver chip, a metal heat sink,
 * screw terminals in and out, and a status light that shows the supply
 * switching (`on`, read every frame).
 */

export function MotorDriver3D({ on, position }: { on: Getter<boolean>; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const led = useRef<Mesh>(null);
  const light = useMemo(() => ownMaterial(P.ink[500], tier, { transparent: false }), [tier]);
  useFrame(() => {
    const m = led.current?.material as MeshStandardMaterial | undefined;
    if (!m) return;
    const lit = on();
    m.color.set(lit ? P.apricot[300] : P.ink[500]);
    m.emissive.set(lit ? P.apricot[500] : P.ink[900]);
  });
  return (
    <group position={position}>
      <RoundedBox args={[0.36, 0.03, 0.3]} radius={0.012} smoothness={2} position={[0, 0.015, 0]} material={kitMaterial("ink", tier)} />
      <mesh position={[-0.04, 0.045, 0.02]} material={kitMaterial("metal", tier)}>
        <boxGeometry args={[0.1, 0.03, 0.1]} />
      </mesh>
      {/* Heat sink: a finned metal block. */}
      <mesh position={[0.09, 0.075, -0.04]} material={kitMaterial("metal", tier)}>
        <boxGeometry args={[0.1, 0.09, 0.12]} />
      </mesh>
      <mesh position={[0, 0.05, -0.12]} material={kitMaterial("orange", tier)}>
        <boxGeometry args={[0.3, 0.05, 0.05]} />
      </mesh>
      <mesh ref={led} position={[-0.13, 0.045, 0.1]} material={light}>
        <sphereGeometry args={[0.018, 12, 8]} />
      </mesh>
    </group>
  );
}
