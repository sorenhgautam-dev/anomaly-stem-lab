"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
  BallCollider,
  CuboidCollider,
  RigidBody,
  type CollisionEnterPayload,
  type RapierRigidBody,
} from "@react-three/rapier";
import { IcosahedronGeometry, MeshBasicMaterial, type Mesh } from "three";
import landing from "@/content/landing.json";
import { anomalySting, glassClink, metalThud, resolveChime } from "@/lib/sound";
import { TOKENS } from "@/lib/tokens";
import { geos } from "./geometries";
import { GoldBurst } from "./GoldBurst";
import { useLanding, type Guess } from "./landing-store";
import { GROUPS } from "./groups";
import { BALL_RADIUS, BALL_START_Y, BALL_X, FLOOR_Y } from "./layout";
import { live } from "./live";
import { mats } from "./materials";

/*
 * The hero experiment (CLAUDE.md §3.2): "Which falls faster?" A steel ball
 * and a glass ball, same size, hang in the air until the visitor guesses.
 * Then gravity turns on for both. Rapier, not a script, decides when they
 * land: same height, no drag, so they land together.
 */

type Ball = "steel" | "glass";

const START = {
  steel: { x: -BALL_X, y: BALL_START_Y, z: 0 },
  glass: { x: BALL_X, y: BALL_START_Y, z: 0 },
};

function resultFor(guess: Guess | null) {
  return guess === landing.hero.correct ? "correct" : "wrong";
}

export function HeroExperiment() {
  const phase = useLanding((s) => s.heroPhase);
  const dropId = useLanding((s) => s.dropId);
  const guess = useLanding((s) => s.guess);
  const result = useLanding((s) => s.heroResult);
  const atHero = useLanding((s) => s.atHero);
  const bodies = useRef<Record<Ball, RapierRigidBody | null>>({ steel: null, glass: null });
  const landedAt = useRef<Record<Ball, number | null>>({ steel: null, glass: null });
  const g = geos();
  const m = mats();
  const dropping = phase !== "ask";

  // Return both balls to the start whenever the hero resets.
  useEffect(() => {
    landedAt.current = { steel: null, glass: null };
    (["steel", "glass"] as const).forEach((ball) => {
      const rb = bodies.current[ball];
      if (!rb) return;
      rb.setTranslation(START[ball], true);
      rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    });
  }, [dropId]);

  // Before the drop both balls bob together, in phase, so they start level.
  useFrame((state) => {
    if (dropping) return;
    const y = BALL_START_Y + Math.sin(state.clock.elapsedTime * 1.4) * 0.05;
    bodies.current.steel?.setNextKinematicTranslation({ ...START.steel, y });
    bodies.current.glass?.setNextKinematicTranslation({ ...START.glass, y });
  });

  const onContact = (ball: Ball) => (payload: CollisionEnterPayload) => {
    if (payload.other.rigidBodyObject?.name !== "floor") return;
    const store = useLanding.getState();
    if (store.heroPhase !== "dropping" || landedAt.current[ball] !== null) return;
    landedAt.current[ball] = performance.now();
    if (ball === "steel") metalThud(1);
    else glassClink(1, 0.72);

    const { steel, glass } = landedAt.current;
    if (steel === null || glass === null) return;
    store.showCaption(landing.captions.landing);
    // Ignore these timers if the visitor resets before they fire.
    const drop = store.dropId;
    const stale = () => useLanding.getState().dropId !== drop;
    window.setTimeout(() => {
      if (stale()) return;
      const outcome = resultFor(useLanding.getState().guess);
      useLanding.getState().land(outcome);
      if (outcome === "wrong") {
        live.pulse = 1;
        anomalySting();
        useLanding.getState().showCaption(landing.captions.anomaly);
      } else {
        resolveChime();
        useLanding.getState().showCaption(landing.captions.correct);
      }
      // ANOMALY DETECTED and the ghost play first; only then does Ano speak.
      window.setTimeout(() => {
        if (!stale()) useLanding.getState().setAnoReady();
      }, outcome === "wrong" ? 1350 : 350);
    }, 420);
  };

  const ballProps = {
    type: dropping ? ("dynamic" as const) : ("kinematicPosition" as const),
    colliders: false as const,
    linearDamping: 0,
    angularDamping: 0.4,
    ccd: true,
  };

  return (
    <group>
      <RigidBody
        ref={(el) => {
          bodies.current.steel = el;
        }}
        position={[START.steel.x, START.steel.y, START.steel.z]}
        onCollisionEnter={onContact("steel")}
        {...ballProps}
      >
        {/* Steel is about 3× denser than glass. It makes no difference to the fall. */}
        <BallCollider args={[BALL_RADIUS]} density={7.8} restitution={0.3} collisionGroups={GROUPS.ball} />
        <mesh geometry={g.ball} material={m.steel} scale={BALL_RADIUS} />
      </RigidBody>

      <RigidBody
        ref={(el) => {
          bodies.current.glass = el;
        }}
        position={[START.glass.x, START.glass.y, START.glass.z]}
        onCollisionEnter={onContact("glass")}
        {...ballProps}
      >
        <BallCollider args={[BALL_RADIUS]} density={2.5} restitution={0.3} collisionGroups={GROUPS.ball} />
        <mesh geometry={g.ball} material={m.thickGlass} scale={BALL_RADIUS} />
      </RigidBody>

      <RigidBody type="fixed" name="floor" colliders={false} position={[0, FLOOR_Y - 0.1, 0]}>
        <CuboidCollider args={[40, 0.1, 40]} collisionGroups={GROUPS.floor} />
      </RigidBody>

      {phase === "ask" && atHero && (
        <>
          <BallLabel x={-BALL_X} text={landing.hero.balls.steel} />
          <BallLabel x={BALL_X} text={landing.hero.balls.glass} />
        </>
      )}

      {result === "wrong" && atHero && guess && guess !== "same" && (
        // The student's prediction as a ghost: the ball they expected to lag
        // is still in the air when the other one lands.
        <Ghost x={guess === "heavy" ? BALL_X : -BALL_X} />
      )}

      {result === "correct" && <GoldBurst key={dropId} position={[0, FLOOR_Y, 0]} />}
    </group>
  );
}

function BallLabel({ x, text }: { x: number; text: string }) {
  return (
    <Html position={[x, BALL_START_Y - BALL_RADIUS - 0.28, 0]} center zIndexRange={[5, 0]}>
      <span className="pointer-events-none whitespace-nowrap rounded-control border border-pearl/15 bg-void/50 px-2.5 py-1 font-mono text-[11px] text-pearl/75 backdrop-blur-md">
        {text}
      </span>
    </Html>
  );
}

function Ghost({ x }: { x: number }) {
  const wire = useRef<Mesh>(null);
  const shell = useMemo(
    () => ({
      geometry: new IcosahedronGeometry(1, 2),
      fill: new MeshBasicMaterial({ color: TOKENS.lilac, transparent: true, opacity: 0.12, depthWrite: false }),
      edges: new MeshBasicMaterial({
        color: TOKENS.lilac,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    }),
    [],
  );
  useEffect(
    () => () => {
      shell.geometry.dispose();
      shell.fill.dispose();
      shell.edges.dispose();
    },
    [shell],
  );
  useFrame((state) => {
    const mesh = wire.current;
    if (!mesh) return;
    mesh.rotation.y = state.clock.elapsedTime * 0.4;
    if (mesh.material instanceof MeshBasicMaterial) {
      mesh.material.opacity = 0.38 + Math.sin(state.clock.elapsedTime * 3) * 0.14;
    }
  });
  const y = FLOOR_Y + BALL_RADIUS + 1.15;
  return (
    <group position={[x, y, 0]}>
      <mesh geometry={shell.geometry} material={shell.fill} scale={BALL_RADIUS} />
      <mesh ref={wire} geometry={shell.geometry} material={shell.edges} scale={BALL_RADIUS * 1.01} />
      <Html position={[0, BALL_RADIUS + 0.22, 0]} center zIndexRange={[5, 0]}>
        <span className="pointer-events-none whitespace-nowrap rounded-control border border-dashed border-lilac/60 px-2.5 py-1 font-mono text-[11px] text-lilac">
          {landing.hero.ghostLabel}
        </span>
      </Html>
    </group>
  );
}
