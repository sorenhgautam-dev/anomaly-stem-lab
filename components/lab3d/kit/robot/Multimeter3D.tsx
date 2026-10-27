"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useQuality } from "@/lib/quality";
import { kitMaterial } from "../materials";
import type { Getter } from "../chem/glass";
import { Lcd } from "./Lcd";

/*
 * A toy multimeter (DESIGN.md §7.5 kit "multimeter", §8 toy-like rounded
 * instruments with small screens in Geist Mono): an orange body with a white
 * face, a warm LCD that follows `reading`, a selector dial and two probe
 * sockets. It leans back on the bench, facing +Z. `SOCKETS` are the probe
 * sockets (local), for cables.
 */

export const SOCKETS: [number, number, number][] = [
  [-0.07, 0.11, 0.05],
  [0.07, 0.11, 0.05],
];

export function Multimeter3D({ reading, unit, position, rotation }: { reading: Getter<string>; unit: string; position?: [number, number, number]; rotation?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const lcd = useMemo(() => new Lcd(unit), [unit]);
  useEffect(() => () => lcd.dispose(), [lcd]);
  useFrame(() => lcd.draw(reading()));
  return (
    <group position={position} rotation={rotation}>
      <group rotation={[-0.45, 0, 0]} position={[0, 0.03, 0]}>
        <RoundedBox args={[0.36, 0.58, 0.09]} radius={0.04} smoothness={3} position={[0, 0.29, 0]} material={kitMaterial("orange", tier)} />
        <RoundedBox args={[0.3, 0.5, 0.02]} radius={0.02} smoothness={2} position={[0, 0.3, 0.045]} material={kitMaterial("plastic", tier)} />
        <mesh position={[0, 0.46, 0.057]}>
          <planeGeometry args={[0.25, 0.083]} />
          <meshBasicMaterial map={lcd.texture} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.28, 0.06]} rotation={[Math.PI / 2, 0, 0]} material={kitMaterial("ink", tier)}>
          <cylinderGeometry args={[0.06, 0.06, 0.025, 24]} />
        </mesh>
        <mesh position={[0.025, 0.3, 0.074]} rotation={[0, 0, -0.7]} material={kitMaterial("plastic", tier)}>
          <boxGeometry args={[0.012, 0.07, 0.006]} />
        </mesh>
        {SOCKETS.map((p, i) => (
          <mesh key={i} position={p} rotation={[Math.PI / 2, 0, 0]} material={kitMaterial(i ? "orange" : "ink", tier)}>
            <cylinderGeometry args={[0.022, 0.022, 0.02, 14]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
