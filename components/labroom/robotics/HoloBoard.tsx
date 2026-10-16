"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { RAMP } from "@/lib/tokens";
import { roomGeos } from "../geometry";
import { roomMats } from "../materials";
import { usePulse } from "../pulses";
import { room } from "../room-state";
import { beamMaterial } from "../shaders/light";
import { holoBoardMaterial } from "../shaders/surfaces";

/*
 * The robotics "window": a holo board of dark tinted glass standing on the
 * workbench, leaning back so it faces the camera, sized to the DOM stage
 * every frame. The circuit (SVG) is drawn on it; light rises from the
 * projector bar at its base, and glowing brackets mark its corners.
 */

const CORNERS: [number, number][] = [
  [-1, 1],
  [1, 1],
  [-1, -1],
  [1, -1],
];
const ARM = 0.12;
const THICK = 0.007;

export function HoloBoard() {
  const g = roomGeos();
  const m = roomMats();
  const glass = useMemo(() => holoBoardMaterial(), []);
  const rise = useMemo(() => beamMaterial(RAMP.ion[300], 2.2), []);
  useEffect(() => () => glass.dispose(), [glass]);
  useEffect(() => () => rise.dispose(), [rise]);
  usePulse(glass, rise);

  const board = useRef<Group>(null);
  const plate = useRef<Mesh>(null);
  const glow = useRef<Mesh>(null);
  const bar = useRef<Mesh>(null);
  const strip = useRef<Mesh>(null);
  const brackets = useRef<(Group | null)[]>([]);

  useFrame(() => {
    const f = room.frame;
    const w = f.right - f.left;
    const top = f.top;
    const bottom = Math.min(0, f.bottom);
    const h = top - bottom;
    board.current?.rotation.set(-room.pitch, 0, 0);
    plate.current?.position.set(0, (top + bottom) / 2, -0.003);
    plate.current?.scale.set(w, h, 1);
    glow.current?.position.set(0, bottom, 0.004);
    glow.current?.scale.set(w * 0.48, 0.44, 0.02);
    bar.current?.position.set(0, 0.024, 0.07);
    bar.current?.scale.set(w + 0.12, 0.048, 0.13);
    strip.current?.position.set(0, 0.049, 0.13);
    strip.current?.scale.set(w + 0.06, 0.004, 0.006);
    brackets.current.forEach((b, i) => {
      const [sx, sy] = CORNERS[i];
      b?.position.set(sx * (w / 2 - 0.035), sy > 0 ? top - 0.035 : bottom + 0.035, 0.006);
      b?.scale.set(sx, sy, 1);
    });
  });

  return (
    <group>
      <group ref={board}>
        <mesh ref={plate} geometry={g.plane} material={glass} renderOrder={5} />
        {/* A flattened cone, upside down: light rising off the projector bar. */}
        <mesh ref={glow} geometry={g.beam} material={rise} rotation-z={Math.PI} renderOrder={6} />
        {CORNERS.map((_, i) => (
          <group
            key={i}
            ref={(el) => {
              brackets.current[i] = el;
            }}
          >
            <mesh geometry={g.box} material={m.stripGlow} position={[-ARM / 2, 0, 0]} scale={[ARM, THICK, THICK]} />
            <mesh geometry={g.box} material={m.stripGlow} position={[0, -ARM / 2, 0]} scale={[THICK, ARM, THICK]} />
          </group>
        ))}
      </group>
      <mesh ref={bar} geometry={g.rounded} material={m.metal} />
      <mesh ref={strip} geometry={g.box} material={m.stripIon} />
    </group>
  );
}
