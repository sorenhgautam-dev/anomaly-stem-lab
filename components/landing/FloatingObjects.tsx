"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BallCollider,
  CuboidCollider,
  CylinderCollider,
  RigidBody,
  type CollisionEnterPayload,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Quaternion, Vector3 } from "three";
import { glassClink } from "@/lib/sound";
import { GROUPS } from "./groups";
import { live } from "./live";
import { makeLayout } from "./object-layout";
import { ScienceObject, ScienceParts, type ObjectKind } from "./science-objects";

/*
 * Zero-gravity science objects (CLAUDE.md §3.1.2–3). Each one is a dynamic
 * Rapier body with damping, pulled softly back toward a home position so the
 * composition survives being knocked around by the cursor. Nearby objects
 * slowly turn to face the cursor. Home positions come from object-layout.ts.
 */

function Collider({ kind, scale }: { kind: ObjectKind; scale: number }) {
  const props = { collisionGroups: GROUPS.floating, restitution: 0.7, friction: 0.15 };
  switch (kind) {
    case "atom":
      return <BallCollider args={[0.62 * scale]} {...props} />;
    case "beaker":
      return <CylinderCollider args={[0.5 * scale, 0.44 * scale]} {...props} />;
    case "flask":
      return <CylinderCollider args={[0.58 * scale, 0.48 * scale]} {...props} />;
    case "gear":
      return (
        <CylinderCollider
          args={[0.1 * scale, 0.52 * scale]}
          rotation={[Math.PI / 2, 0, 0]}
          {...props}
        />
      );
    case "bulb":
      return <BallCollider args={[0.42 * scale]} position={[0, 0.1 * scale, 0]} {...props} />;
    case "robot":
      return <CuboidCollider args={[0.36 * scale, 0.56 * scale, 0.23 * scale]} {...props} />;
  }
}

const PITCH: Record<ObjectKind, number> = {
  atom: 1.25,
  beaker: 1,
  flask: 0.9,
  gear: 0.7,
  bulb: 1.1,
  robot: 0.6,
};

const MAGNET_RADIUS = 2.8;

export function FloatingObjects({ count }: { count: number }) {
  const specs = useMemo(() => makeLayout(count), [count]);
  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const scratch = useMemo(
    () => ({ front: new Vector3(), toCursor: new Vector3(), axis: new Vector3(), q: new Quaternion() }),
    [],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    const { front, toCursor, axis, q } = scratch;
    bodies.current.forEach((rb, i) => {
      const spec = specs[i];
      if (!rb || !spec) return;
      const p = rb.translation();
      const mass = rb.mass();
      const phase = spec.seed * 40;

      // Soft spring toward a slowly wandering home: drift, then settle.
      const k = 0.9 * dt * mass;
      rb.applyImpulse(
        {
          x: (spec.home.x + Math.sin(t * 0.21 + phase) * 0.25 - p.x) * k,
          y: (spec.home.y + Math.cos(t * 0.17 + phase) * 0.3 - p.y) * k,
          z: (spec.home.z + Math.sin(t * 0.13 + phase * 1.3) * 0.25 - p.z) * k,
        },
        true,
      );

      // Idle tumble so nothing ever sits perfectly still.
      const spin = 0.0009 * mass * dt * 60;
      rb.applyTorqueImpulse(
        { x: Math.sin(t * 0.4 + phase) * spin, y: Math.cos(t * 0.33 + phase) * spin, z: 0 },
        true,
      );

      // Magnetic pull: turn toward the cursor when it's close.
      if (!live.pointerActive) return;
      toCursor.set(live.cursor.x - p.x, live.cursor.y - p.y, live.cursor.z - p.z);
      const d = toCursor.length();
      if (d > MAGNET_RADIUS || d < 1e-3) return;
      const r = rb.rotation();
      q.set(r.x, r.y, r.z, r.w);
      front.set(0, 0, 1).applyQuaternion(q);
      axis.crossVectors(front, toCursor.divideScalar(d));
      const s = (1 - d / MAGNET_RADIUS) * 0.004 * mass * dt * 60;
      rb.applyTorqueImpulse({ x: axis.x * s, y: axis.y * s, z: axis.z * s }, true);
    });
  });

  const onHit = (kind: ObjectKind) => (payload: CollisionEnterPayload) => {
    const a = payload.target.rigidBody?.linvel();
    if (!a) return;
    const b = payload.other.rigidBody?.linvel() ?? { x: 0, y: 0, z: 0 };
    const speed = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    if (speed > 1.3) glassClink(speed / 7, PITCH[kind]);
  };

  return (
    <ScienceParts limit={96}>
      {specs.map((spec, i) => (
        <RigidBody
          key={i}
          ref={(el) => {
            bodies.current[i] = el;
          }}
          position={spec.home.toArray()}
          rotation={spec.rotation}
          colliders={false}
          gravityScale={0}
          linearDamping={0.7}
          angularDamping={0.75}
          onCollisionEnter={onHit(spec.kind)}
        >
          <Collider kind={spec.kind} scale={spec.scale} />
          <group scale={spec.scale}>
            <ScienceObject kind={spec.kind} seed={spec.seed} />
          </group>
        </RigidBody>
      ))}
    </ScienceParts>
  );
}
