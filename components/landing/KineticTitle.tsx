"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { SphereGeometry, Vector3, type Mesh } from "three";
import { buildWord } from "./glyphs";
import { TITLE_CENTER, TITLE_SCALE } from "./layout";
import { live } from "./live";
import { mats } from "./materials";
import { mulberry32, wrapAngle } from "./random";
import { titleFx } from "./title-material";

/*
 * Kinetic 3D type (CLAUDE.md §3.1.6). The letters of ANOMALY are separate
 * meshes. They tumble in from deep space and snap into place on the way to
 * Predict, scatter at Break, and rebuild at Rebuild. Each letter is a damped
 * spring, so arriving overshoots a little: that's the snap. Scrolling back
 * reverses everything because the target depends only on scroll position.
 */

interface Pose {
  pos: Vector3;
  rot: Vector3;
  spin: Vector3;
}

interface LetterState {
  pos: Vector3;
  vel: Vector3;
  rot: Vector3;
  rotVel: Vector3;
  intro: Pose;
  burst: Pose;
}

/** Whether letter i should be assembled at scroll progress p. Staggered. */
function assembled(p: number, i: number): boolean {
  if (p < 0.5) return p > 0.12 + i * 0.008;
  if (p < 0.8) return p < 0.63 + i * 0.006;
  return p > 0.84 + i * 0.008;
}

const K_POS = 70;
const C_POS = 11;
const K_ROT = 45;
const C_ROT = 8.5;

export function KineticTitle() {
  const letters = useMemo(() => buildWord("ANOMALY"), []);
  const meshes = useRef<(Mesh | null)[]>([]);
  const nucleus = useRef<Mesh>(null);
  const nucleusGeo = useMemo(() => new SphereGeometry(0.17, 32, 24), []);
  useEffect(() => () => nucleusGeo.dispose(), [nucleusGeo]);

  const states = useMemo<LetterState[]>(
    () =>
      letters.map((letter, i) => {
        const rand = mulberry32(101 + i * 13);
        const signed = () => rand() * 2 - 1;
        // Intro: far behind the title, lost in the fog.
        const introDir = new Vector3(signed(), signed() * 0.6, -0.4 - rand()).normalize();
        const intro: Pose = {
          // Far enough that the fog hides them completely until they fly in.
          pos: introDir.multiplyScalar(48 + rand() * 14),
          rot: new Vector3(signed() * 3, signed() * 3, signed() * 3),
          spin: new Vector3(signed() * 0.6, signed() * 0.6, signed() * 0.4),
        };
        // Break: thrown outward across the frame, a little toward the camera.
        const burst: Pose = {
          pos: letter.home
            .clone()
            .add(new Vector3(letter.home.x * 0.5 + signed() * 4, signed() * 3 + 0.5, 1 + rand() * 4)),
          rot: new Vector3(signed() * 2.5, signed() * 2.5, signed() * 2.5),
          spin: new Vector3(signed() * 0.5, signed() * 0.5, signed() * 0.5),
        };
        return {
          pos: intro.pos.clone(),
          vel: new Vector3(),
          rot: intro.rot.clone(),
          rotVel: new Vector3(),
          intro,
          burst,
        };
      }),
    [letters],
  );

  const scratch = useMemo(() => ({ target: new Vector3(), rotTarget: new Vector3() }), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    const p = live.progress;
    const { target, rotTarget } = scratch;
    const m = mats();

    letters.forEach((letter, i) => {
      const s = states[i];
      const mesh = meshes.current[i];
      if (!mesh) return;
      const together = live.reducedMotion || assembled(p, i);
      const pose = p < 0.5 ? s.intro : s.burst;

      if (together) {
        target.copy(letter.home);
        target.y += Math.sin(t * 1.1 + i * 0.7) * 0.04;
        rotTarget.set(
          -state.pointer.y * 0.22 + Math.sin(t * 0.9 + i * 0.6) * 0.04,
          state.pointer.x * (0.28 + 0.1 * Math.sin(i * 1.7)),
          0,
        );
      } else {
        target
          .copy(pose.pos)
          .add({ x: Math.sin(t * 0.4 + i) * 0.5, y: Math.cos(t * 0.33 + i * 2) * 0.5, z: 0 });
        rotTarget.copy(pose.rot).addScaledVector(pose.spin, t);
      }

      if (live.reducedMotion) {
        s.pos.copy(target);
        s.rot.copy(rotTarget);
      } else {
        // Damped springs: semi-implicit Euler.
        s.vel.x += ((target.x - s.pos.x) * K_POS - s.vel.x * C_POS) * dt;
        s.vel.y += ((target.y - s.pos.y) * K_POS - s.vel.y * C_POS) * dt;
        s.vel.z += ((target.z - s.pos.z) * K_POS - s.vel.z * C_POS) * dt;
        s.pos.addScaledVector(s.vel, dt);
        s.rotVel.x += (wrapAngle(rotTarget.x - s.rot.x) * K_ROT - s.rotVel.x * C_ROT) * dt;
        s.rotVel.y += (wrapAngle(rotTarget.y - s.rot.y) * K_ROT - s.rotVel.y * C_ROT) * dt;
        s.rotVel.z += (wrapAngle(rotTarget.z - s.rot.z) * K_ROT - s.rotVel.z * C_ROT) * dt;
        s.rot.addScaledVector(s.rotVel, dt);
      }
      mesh.position.copy(s.pos);
      mesh.rotation.set(s.rot.x, s.rot.y, s.rot.z);
    });

    // Cracks at Break, gold seams at Rebuild (title-material.ts).
    const fx = titleFx(p);
    const u = m.title.uniforms;
    u.uTime.value = t;
    u.uCrack.value = fx.crack;
    u.uSeam.value = fx.seam;
    u.uMotion.value = live.reducedMotion ? 0 : 1;

    // The O carries a small glowing nucleus: lilac, gold once rebuilt.
    if (nucleus.current) {
      nucleus.current.material = p > 0.84 ? m.glowGold : m.glowLilac;
      nucleus.current.scale.setScalar(1 + Math.sin(t * 2.4) * 0.08);
    }
  });

  const m = mats();
  return (
    <group position={TITLE_CENTER} scale={TITLE_SCALE}>
      {letters.map((letter, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          geometry={letter.geometry}
          material={m.title}
          position={states[i].pos.toArray()}
        >
          {letter.char === "O" && <mesh ref={nucleus} geometry={nucleusGeo} material={m.glowLilac} />}
        </mesh>
      ))}
    </group>
  );
}
