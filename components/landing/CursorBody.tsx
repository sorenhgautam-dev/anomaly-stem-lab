"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BallCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { Raycaster, Vector3 } from "three";
import { GROUPS } from "./groups";
import { live, setVec } from "./live";

/*
 * The cursor as an invisible kinematic physics body (CLAUDE.md §3.1.3).
 * It sits on the pointer ray a fixed depth in front of the camera; moving
 * through objects knocks them away with real momentum.
 */

const PARKED = new Vector3(0, -50, 0);

export function CursorBody() {
  const rb = useRef<RapierRigidBody>(null);
  const s = useMemo(
    () => ({ ray: new Raycaster(), target: new Vector3(), current: PARKED.clone() }),
    [],
  );

  useEffect(() => {
    const activate = () => {
      live.pointerActive = true;
    };
    const deactivate = () => {
      live.pointerActive = false;
    };
    window.addEventListener("pointermove", activate);
    document.documentElement.addEventListener("pointerleave", deactivate);
    return () => {
      window.removeEventListener("pointermove", activate);
      document.documentElement.removeEventListener("pointerleave", deactivate);
    };
  }, []);

  useFrame((state, delta) => {
    const body = rb.current;
    if (!body) return;
    if (!live.pointerActive) {
      s.current.copy(PARKED);
      setVec(live.cursor, { x: 0, y: 0, z: 1000 });
      body.setNextKinematicTranslation(PARKED);
      return;
    }
    s.ray.setFromCamera(state.pointer, state.camera);
    s.target.copy(s.ray.ray.origin).addScaledVector(s.ray.ray.direction, 5.6);
    if (s.current.y < -40) s.current.copy(s.target);
    else s.current.lerp(s.target, 1 - Math.exp(-delta * 22));
    setVec(live.cursor, s.current);
    body.setNextKinematicTranslation(s.current);
  });

  return (
    <RigidBody ref={rb} type="kinematicPosition" colliders={false} position={PARKED.toArray()}>
      <BallCollider args={[0.5]} collisionGroups={GROUPS.cursor} />
    </RigidBody>
  );
}

/** Ano's invisible body: floating objects get nudged out of Ano's way. */
export function AnoBody() {
  const rb = useRef<RapierRigidBody>(null);
  const wasVisible = useRef(false);
  useFrame(() => {
    const body = rb.current;
    if (!body) return;
    const target = live.anoVisible ? live.ano : PARKED;
    // Teleport when Ano appears or leaves: a kinematic move that long would
    // fling anything near the destination.
    if (live.anoVisible !== wasVisible.current) {
      wasVisible.current = live.anoVisible;
      body.setTranslation(target, true);
    } else {
      body.setNextKinematicTranslation(target);
    }
  });
  return (
    <RigidBody ref={rb} type="kinematicPosition" colliders={false} position={PARKED.toArray()}>
      <BallCollider args={[0.42]} collisionGroups={GROUPS.cursor} />
    </RigidBody>
  );
}
