"use client";

import { useMemo } from "react";
import { Cloud, Clouds } from "@react-three/drei";
import { MeshLambertMaterial } from "three";
import { LAB } from "@/lib/tokens";
import { glowMaterial } from "./materials";

/*
 * The Prevention Lab's sky (DESIGN.md §3.2, §8): a soft glowing sun and
 * fluffy clouds. The sun is a warm gold sphere inside a wide, soft halo (a
 * glow sprite, normal blending so it shows on a light sky). The clouds are
 * drei's volumetric Cloud puffs, drawn from a soft puff texture made for
 * this project (public/textures/cloud.png, generated, no outside asset), so
 * nothing is fetched from a CDN.
 */

export function Sun({ position, radius = 0.24 }: { position: [number, number, number]; radius?: number }) {
  const halo = useMemo(() => {
    const m = glowMaterial(LAB.chemistry.gold);
    m.opacity = 0.85;
    return m;
  }, []);
  const rim = useMemo(() => {
    const m = glowMaterial("#FFF4D6");
    m.opacity = 0.9;
    return m;
  }, []);
  return (
    <group position={position}>
      <sprite material={halo} scale={radius * 7} />
      <sprite material={rim} scale={radius * 3} />
      <mesh>
        <sphereGeometry args={[radius, 48, 32]} />
        <meshStandardMaterial color="#FFE7A8" emissive={LAB.chemistry.gold} emissiveIntensity={0.85} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** A soft cloud bank. `seed` varies its shape; `bounds` its size. */
export function FluffyCloud({ seed = 1, bounds = [0.9, 0.22, 0.3], volume = 0.55, opacity = 0.95, position, segments = 14 }: { seed?: number; bounds?: [number, number, number]; volume?: number; opacity?: number; position?: [number, number, number]; segments?: number }) {
  return (
    <Clouds texture="/textures/cloud.png" material={MeshLambertMaterial} limit={64} position={position}>
      <Cloud seed={seed} segments={segments} bounds={bounds} volume={volume} color="#ffffff" fade={0} speed={0.08} growth={2} opacity={opacity} />
    </Clouds>
  );
}
