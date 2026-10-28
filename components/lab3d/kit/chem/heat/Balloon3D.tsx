"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { LatheGeometry, MeshBasicMaterial, Vector2, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { kitMaterial, ownMaterial } from "../../materials";
import type { Getter } from "../glass";
import { TONE } from "./tones";

/*
 * A stretchy balloon (DESIGN.md §7.5 kit): a translucent teardrop skin that
 * swells with `swell` (its linear scale), standing on its neck at the group's
 * origin. Children ride at the balloon's centre without being scaled, so the
 * particles inside keep their own size. The skin is sage rubber, rolled into
 * a lip round the flask's neck. `ghost` draws the student's belief: a pale
 * teal skin with a wire outline (shape and opacity, not only colour).
 */

const NECK_Y = 0.015;
/** The balloon's centre above its neck, for a balloon of radius r. */
export const centreOf = (r: number) => r * 1.08 + NECK_Y;

function skin(r: number): LatheGeometry {
  const pts = [new Vector2(0.04, -0.05), new Vector2(0.045, 0)];
  for (let i = 0; i <= 20; i++) {
    const a = 0.32 + ((Math.PI - 0.32) * i) / 20;
    pts.push(new Vector2(Math.max(0.001, r * Math.sin(a)), r * (1 - Math.cos(a)) * 1.08 + NECK_Y));
  }
  return new LatheGeometry(pts, 40);
}

export function Balloon3D({ radius, swell, ghost = false, fade, position, children }: { radius: number; swell: Getter<number>; ghost?: boolean; fade?: Getter<number>; position?: [number, number, number]; children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  const bob = useRef<Group>(null);
  const shell = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const core = useRef<Group>(null);
  const geometry = useMemo(() => skin(radius), [radius]);
  const base = ghost ? 0.16 : 0.34;
  const material = useMemo(() => ownMaterial(ghost ? TONE.ghost : LAB.chemistry.sage, tier, { transparent: true, opacity: base }), [tier, ghost, base]);
  const wire = useMemo(() => new MeshBasicMaterial({ color: TONE.ghost, wireframe: true, transparent: true, opacity: 0.3, depthWrite: false }), []);
  useEffect(() => () => wire.dispose(), [wire]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    const s = swell();
    shell.current?.scale.setScalar(s);
    if (body.current) (body.current.material as MeshStandardMaterial).opacity = base * (fade ? fade() : 1);
    // A floating ghost bobs gently; the real one stays on its flask.
    if (core.current) core.current.position.set(0, centreOf(radius) * s, 0);
    if (ghost && bob.current) bob.current.position.y = Math.sin(clock.elapsedTime * 1.4) * 0.015;
  });

  return (
    <group position={position}>
      <group ref={bob}>
        <group ref={shell}>
          <mesh ref={body} geometry={geometry} material={material} renderOrder={2} />
          {ghost && <mesh geometry={geometry} material={wire} renderOrder={3} />}
        </group>
        {!ghost && (
          <mesh position={[0, -0.03, 0]} rotation={[Math.PI / 2, 0, 0]} material={kitMaterial("sage", tier)}>
            <torusGeometry args={[0.05, 0.016, 12, 32]} />
          </mesh>
        )}
        <group ref={core}>{children}</group>
      </group>
    </group>
  );
}
