"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, type Mesh, type SpotLight } from "three";
import { RAMP } from "@/lib/tokens";
import { roomGeos } from "../geometry";
import { roomMats } from "../materials";
import { power, usePulse } from "../pulses";
import { room } from "../room-state";
import { beamMaterial } from "../shaders/light";
import { hoodBackMaterial } from "../shaders/surfaces";

/*
 * The fume hood round the experiment (CLAUDE.md §3.6.2). Its opening is
 * sized from the window every frame, so the frame always sits just inside
 * the DOM stage: posts at the sides, a canopy with a light strip on top, a
 * raised glass sash, and a dark back wall with baffle slots.
 */

const POST = 0.07;
const DEPTH = 0.95;
/** z of the hood's middle; its front is about level with the window plane. */
const MID = -0.32;

export function FumeHood() {
  const g = roomGeos();
  const m = roomMats();
  const back = useMemo(() => hoodBackMaterial(), []);
  const wash = useMemo(() => beamMaterial(RAMP.ion[100], 0.55), []);
  useEffect(() => () => back.dispose(), [back]);
  useEffect(() => () => wash.dispose(), [wash]);
  usePulse(back, wash);

  const postL = useRef<Mesh>(null);
  const postR = useRef<Mesh>(null);
  const canopyBox = useRef<Mesh>(null);
  const strip = useRef<Mesh>(null);
  const sash = useRef<Mesh>(null);
  const sashBar = useRef<Mesh>(null);
  const backWall = useRef<Mesh>(null);
  const sideL = useRef<Mesh>(null);
  const sideR = useRef<Mesh>(null);
  const washCone = useRef<Mesh>(null);
  const light = useRef<SpotLight>(null);
  const target = useMemo(() => new Object3D(), []);

  useFrame(() => {
    const f = room.frame;
    const half = f.right;
    const top = Math.max(0.6, f.top * Math.cos(room.pitch));
    const inner = half - 0.06 - POST;
    const canopy = top * 0.9;
    const sashH = canopy * 0.2;
    const set = (ref: RefObject<Mesh | null>, p: [number, number, number], s: [number, number, number]) => {
      ref.current?.position.set(...p);
      ref.current?.scale.set(...s);
    };
    set(postL, [-(inner + POST / 2), canopy / 2, MID], [POST, canopy, DEPTH]);
    set(postR, [inner + POST / 2, canopy / 2, MID], [POST, canopy, DEPTH]);
    set(canopyBox, [0, canopy + 0.3, MID], [2 * (inner + POST) + 0.04, 0.6, DEPTH + 0.06]);
    set(strip, [0, canopy - 0.006, MID + DEPTH / 2 - 0.06], [2 * inner - 0.06, 0.008, 0.03]);
    // The light falling from the strip onto the bench: a lit work surface.
    set(washCone, [0, canopy - 0.01, MID + 0.1], [inner * 0.95, canopy, 0.5]);
    set(sash, [0, canopy - sashH / 2, MID + DEPTH / 2 - 0.01], [2 * inner, sashH, 1]);
    set(sashBar, [0, canopy - sashH, MID + DEPTH / 2], [2 * inner, 0.02, 0.03]);
    set(backWall, [0, canopy / 2, MID - DEPTH / 2 + 0.02], [2 * inner, canopy, 1]);
    set(sideL, [-inner, canopy / 2, MID], [DEPTH, canopy, 1]);
    set(sideR, [inner, canopy / 2, MID], [DEPTH, canopy, 1]);
    const l = light.current;
    if (l) {
      l.position.set(0, canopy - 0.03, MID + DEPTH / 2 - 0.1);
      target.position.set(0, 0, MID);
      l.intensity = 3.5 + power.value * 3;
    }
  });

  return (
    <group>
      <mesh ref={postL} geometry={g.box} material={m.metal} />
      <mesh ref={postR} geometry={g.box} material={m.metal} />
      <mesh ref={canopyBox} geometry={g.box} material={m.metal} />
      <mesh ref={strip} geometry={g.box} material={m.stripMist} />
      <mesh ref={washCone} geometry={g.beam} material={wash} renderOrder={2} />
      <mesh ref={sash} geometry={g.plane} material={m.sash} renderOrder={4} />
      <mesh ref={sashBar} geometry={g.box} material={m.chrome} />
      <mesh ref={backWall} geometry={g.plane} material={back} />
      <mesh ref={sideL} geometry={g.plane} material={m.darkMetal} rotation-y={Math.PI / 2} />
      <mesh ref={sideR} geometry={g.plane} material={m.darkMetal} rotation-y={-Math.PI / 2} />
      <primitive object={target} />
      <spotLight ref={light} target={target} color={RAMP.ion[100]} angle={1.15} penumbra={1} distance={4} decay={1.6} intensity={3.5} />
    </group>
  );
}
