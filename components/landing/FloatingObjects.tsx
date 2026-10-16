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
import { CatmullRomCurve3, Line3, Quaternion, Vector3 } from "three";
import { glassClink } from "@/lib/sound";
import { GROUPS } from "./groups";
import { CAMERA_KEYS, TITLE_CENTER, TITLE_SCALE } from "./layout";
import { live } from "./live";
import { mulberry32 } from "./random";
import { ScienceObject, ScienceParts, type ObjectKind } from "./science-objects";

/*
 * Zero-gravity science objects (CLAUDE.md §3.1.2–3). Each one is a dynamic
 * Rapier body with damping, pulled softly back toward a home position so the
 * composition survives being knocked around by the cursor. Nearby objects
 * slowly turn to face the cursor.
 */

interface Spec {
  kind: ObjectKind;
  home: Vector3;
  rotation: [number, number, number];
  scale: number;
  seed: number;
}

const KINDS: ObjectKind[] = ["atom", "gear", "beaker", "robot", "flask", "bulb"];

const ZONES = [
  // Around the hero experiment
  { share: 0.38, x: [-5.2, 5.2], y: [-0.6, 2.8], z: [-3.6, 0.6], hero: true },
  // The corridor the camera flies down
  { share: 0.3, x: [-5.5, 6.5], y: [-0.5, 3.6], z: [-7, -3] },
  // Around the title
  { share: 0.32, x: [-6.5, 6.5], y: [-0.6, 3.4], z: [-13, -7] },
] as const;

const HERO_CAM = new Vector3(...CAMERA_KEYS[0].pos);
const TAN_HALF_FOV = Math.tan((35 / 2) * (Math.PI / 180));

/** True if p would sit over the balls or the hero copy, seen from the hero camera at 16:10. */
function inHeroShot(p: Vector3): boolean {
  const depth = HERO_CAM.z - p.z;
  if (depth <= 0.5) return true;
  const sx = (p.x - HERO_CAM.x) / (depth * TAN_HALF_FOV * 1.6);
  const sy = (p.y - CAMERA_KEYS[0].look[1]) / (depth * TAN_HALF_FOV);
  const overBalls = Math.abs(sx) < 0.5 && sy > -0.8 && sy < 0.85;
  const overCopy = sx < -0.25 && sy < -0.05;
  return overBalls || overCopy;
}

/** Segments from each chapter camera to points along the title. */
const SIGHTLINES: Line3[] = CAMERA_KEYS.slice(1).flatMap((key) =>
  [-3, -2, -1, 0, 1, 2, 3].map(
    (x) =>
      new Line3(
        new Vector3(...key.pos),
        new Vector3(TITLE_CENTER[0] + x * TITLE_SCALE * 1.6, TITLE_CENTER[1], TITLE_CENTER[2]),
      ),
  ),
);

/** True if p would block the camera's view of the title in any chapter. */
function blocksTitle(p: Vector3): boolean {
  const closest = new Vector3();
  return SIGHTLINES.some((line) => line.closestPointToPoint(p, true, closest).distanceTo(p) < 1.1);
}

function makeLayout(count: number): Spec[] {
  const rand = mulberry32(7);
  const between = ([lo, hi]: readonly [number, number]) => lo + rand() * (hi - lo);
  const rail = new CatmullRomCurve3(
    CAMERA_KEYS.map((k) => new Vector3(...k.pos)),
    false,
    "centripetal",
  ).getSpacedPoints(90);

  const specs: Spec[] = [];
  let placed = 0;
  ZONES.forEach((zone, zi) => {
    const n = zi === ZONES.length - 1 ? count - placed : Math.round(count * zone.share);
    let made = 0;
    for (let tries = 0; made < n && tries < 4000; tries++) {
      const p = new Vector3(between(zone.x), between(zone.y), between(zone.z));
      // From the hero camera, keep the middle of the frame (the balls and
      // where they land) and the bottom-left copy clear: objects frame the
      // experiment instead of covering it.
      if (inHeroShot(p)) continue;
      // Keep clear of the title and the camera's view of it.
      if (Math.abs(p.x) < 4.3 && p.y > -0.5 && p.y < 1.7 && p.z < -6.6 && p.z > -10.4) continue;
      if (blocksTitle(p)) continue;
      // Keep clear of the camera rail and of each other.
      if (rail.some((r) => r.distanceTo(p) < 1.45)) continue;
      if (specs.some((s) => s.home.distanceTo(p) < 1.25)) continue;
      const kind = KINDS[(specs.length + zi) % KINDS.length];
      specs.push({
        kind,
        home: p,
        rotation: [rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2],
        scale: kind === "atom" ? 0.95 + rand() * 0.3 : 0.75 + rand() * 0.4,
        seed: rand(),
      });
      made++;
    }
    placed += made;
  });
  return specs;
}

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
