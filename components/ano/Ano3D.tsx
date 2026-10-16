"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, TorusGeometry, Vector3, type Group, type Mesh } from "three";
import { useLanding } from "@/components/landing/landing-store";
import { live, setVec } from "@/components/landing/live";
import { geos } from "@/components/landing/geometries";
import { mats } from "@/components/landing/materials";
import { TOKENS } from "@/lib/tokens";

/*
 * Ano (CLAUDE.md §1, §7): a small floating glass robot with one glowing eye.
 * Ano flies alongside the camera, a little behind it so the motion feels
 * alive, and its eye follows the cursor. Shows up once the hero experiment
 * has a result or the visitor starts scrolling.
 */

/** Ano's overall scale: the shell is 0.42 × this in radius. */
const ANO_SIZE = 0.62;

export function Ano3D() {
  const visible = useLanding((s) => s.anoReady || s.pastHero);
  const result = useLanding((s) => s.heroResult);
  const group = useRef<Group>(null);
  const core = useRef<Group>(null);
  const eye = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const haloGeo = useMemo(() => new TorusGeometry(0.52, 0.006, 8, 96), []);

  const frame = useRef({
    pos: new Vector3(2.4, 0.9, 2),
    target: new Vector3(),
    fwd: new Vector3(),
    right: new Vector3(),
    up: new Vector3(),
    aim: new Object3D(),
    scale: 0,
    scaleVel: 0,
    moodAt: 0,
    lastResult: null as string | null,
    nextBlink: 2,
  });

  useFrame((state, delta) => {
    const g = group.current;
    const s = frame.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    const cam = state.camera;
    const m = mats();

    // Seat Ano to the right of the camera's view, a few units ahead: beside
    // the speech bubble in the hero, then lower right (clear of the title)
    // once the chapters start.
    const narrow = state.size.width < state.size.height;
    const inChapters = Math.min(1, Math.max(0, (live.progress - 0.04) / 0.12));
    const lift = narrow ? 0.85 + inChapters * 0.45 : 0.05 - inChapters * 0.67;
    cam.getWorldDirection(s.fwd);
    s.right.crossVectors(s.fwd, cam.up).normalize();
    s.up.crossVectors(s.right, s.fwd);
    s.target
      .copy(cam.position)
      .addScaledVector(s.fwd, 4.4)
      .addScaledVector(s.right, narrow ? 0.45 : 1.5 + inChapters * 0.1)
      .addScaledVector(s.up, lift + Math.sin(t * 1.3) * 0.06);
    s.pos.lerp(s.target, 1 - Math.exp(-dt * 2.6));
    g.position.copy(s.pos);
    setVec(live.ano, s.pos);
    live.anoVisible = visible;

    // Springy pop in and out.
    const goal = visible ? ANO_SIZE : 0;
    s.scaleVel += ((goal - s.scale) * 140 - s.scaleVel * 13) * dt;
    s.scale += s.scaleVel * dt;
    g.scale.setScalar(Math.max(0, s.scale));
    g.visible = s.scale > 0.01;

    // The eye looks at the cursor, or at the camera when there isn't one.
    s.aim.position.copy(s.pos);
    if (live.pointerActive) s.aim.lookAt(live.cursor.x, live.cursor.y, live.cursor.z);
    else s.aim.lookAt(cam.position);
    core.current?.quaternion.slerp(s.aim.quaternion, 1 - Math.exp(-dt * 6));

    // Mood: red glitch for a moment on a wrong guess, then curious lilac;
    // gold on a correct one.
    if (result !== s.lastResult) {
      s.lastResult = result;
      s.moodAt = t;
    }
    const sinceMood = t - s.moodAt;
    if (eye.current) {
      eye.current.material =
        result === "wrong" && sinceMood < 0.9
          ? m.glowAnomaly
          : result === "correct"
            ? m.glowGold
            : m.glowLilac;
      // Blink now and then.
      if (t > s.nextBlink) s.nextBlink = t + 2.5 + Math.random() * 3;
      const blink = s.nextBlink - t < 0.12 ? 0.15 : 1;
      const glitch = result === "wrong" && sinceMood < 0.9 ? 1 + Math.sin(t * 60) * 0.25 : 1;
      eye.current.scale.set(0.09 * glitch, 0.042 * blink, 0.03);
    }
    if (halo.current) {
      halo.current.rotation.z += dt * (result === "correct" && sinceMood < 1.5 ? 6 : 0.6);
    }
  });

  const g = geos();
  const m = mats();
  return (
    <group ref={group} scale={0}>
      <mesh geometry={g.ball} material={m.thickGlass} scale={0.42} />
      <group ref={core}>
        <mesh geometry={g.ball} material={m.dark} scale={0.29} />
        <mesh ref={eye} geometry={g.ball} material={m.glowLilac} position={[0, 0.02, 0.272]} />
      </group>
      <mesh ref={halo} geometry={haloGeo} material={m.glowLilac} rotation={[1.25, 0.2, 0]} />
      <pointLight color={TOKENS.lilac} intensity={1.4} distance={2.4} decay={2} />
    </group>
  );
}
