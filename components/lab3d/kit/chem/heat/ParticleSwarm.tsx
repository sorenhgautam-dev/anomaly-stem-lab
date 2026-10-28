"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { SphereGeometry, type InstancedMesh } from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { TONE } from "./tones";
import { kitMaterial, liquidMaterial } from "../../materials";
import type { Getter } from "../glass";
import { Swarm } from "./swarm";

/*
 * A swarm of molecules as one instanced mesh (see swarm.ts). Every value is
 * a getter read each frame; `ghost` draws the student's belief as
 * translucent dots instead of glossy ones (DESIGN.md §8.1 ghost vs reality).
 */

const DOT = new SphereGeometry(1, 12, 10);

export interface SwarmProps {
  max: number;
  trail?: number;
  homes?: Float32Array | null;
  seed: number;
  wander?: number;
  color: string;
  ghost?: boolean;
  count: Getter<number>;
  speed: Getter<number>;
  size: Getter<number>;
  radius: Getter<number>;
  height?: Getter<number>;
  order?: Getter<number>;
  show?: Getter<number>;
  position?: [number, number, number];
}

export function ParticleSwarm({ max, trail = 0, homes = null, seed, wander = 0, color, ghost = false, count, speed, size, radius, height, order, show, position }: SwarmProps) {
  const tier = useQuality((s) => s.level);
  const mesh = useRef<InstancedMesh>(null);
  const [swarm] = useState(() => new Swarm(max, trail, homes, seed, wander));
  const material = ghost ? liquidMaterial(P.white, tier, 0.7) : kitMaterial("plastic", tier);

  useEffect(() => {
    if (mesh.current) swarm.paint(mesh.current, color, ghost ? TONE.ghostPale : P.white);
  }, [swarm, color, ghost]);

  useFrame(({ clock }, delta) => {
    const m = mesh.current;
    if (!m) return;
    swarm.step(m, count(), speed(), size(), order ? order() : 0, radius(), height ? height() : 0, show ? show() : 1, Math.min(delta, 1 / 30), clock.elapsedTime);
  });

  return <instancedMesh ref={mesh} args={[DOT, undefined, max * (1 + trail)]} material={material} position={position} frustumCulled={false} />;
}
