"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, type Mesh, type MeshStandardMaterial } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality, type Quality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { latheGeometry, mergeParts } from "../detail";
import { kitMaterial, ownMaterial } from "../materials";
import type { Getter } from "../chem/glass";
import { Readout } from "../chem/instruments";
import { ghostMaterial } from "./looks";
import { Wheel3D } from "./Wheel3D";

/*
 * A two-wheeled robot (DESIGN.md §7.5 kit "robot chassis and wheels", §8.2,
 * Robotics' white with black trim): a bevelled white body, two driven wheels
 * on one axle, a steel caster ball in a black housing at the back, the brain
 * board on top (black, a steel chip, screws at its corners, a status light
 * that blinks gold while it runs), a black bumper and a sensor eye with a
 * teal lens at the front. It faces −Z with the axle's midpoint at the origin
 * (the point the path follows). Each wheel carries a gold arrow on the mat
 * as long as its speed.
 */

const SHAFT = new BoxGeometry(0.024, 0.006, 1).translate(0, 0.003, -0.5);
const HEAD = new ConeGeometry(0.034, 0.06, 3).rotateX(-Math.PI / 2).rotateZ(Math.PI).scale(1, 0.18, 1);

/** A flat arrow on the floor pointing forward (−Z), `length` long, with a percentage label at its tip. */
function SpeedArrow({ x, length, label }: { x: number; length: number; label: string }) {
  const tier = useQuality((s) => s.level);
  const l = Math.max(0.001, length);
  return (
    <group position={[x, 0.004, 0]}>
      <mesh geometry={SHAFT} material={kitMaterial("gold", tier)} scale={[1, 1, l]} visible={length > 0.005} />
      <mesh geometry={HEAD} material={kitMaterial("gold", tier)} position={[0, 0.004, -l - 0.02]} visible={length > 0.005} />
      {/* Keyed by the text: a label's canvas must not change size once uploaded. */}
      <Readout key={label} text={() => label} height={0.09} position={[0, 0.07, -l - 0.1]} />
    </group>
  );
}

export interface RobotProps {
  /** Distance between the wheel centres. */
  track: number;
  wheelRadius: number;
  /** Each wheel's roll angle in radians (getters, read every frame). */
  spinLeft?: Getter<number>;
  spinRight?: Getter<number>;
  /** Wheel speeds as a share of top speed (0–1), for the arrows and labels. */
  left: number;
  right: number;
  /** Arrow length at full speed. */
  arrow?: number;
  /** Status light on (the brain is running a program). */
  running?: Getter<boolean>;
}

export function RobotChassis3D({ track, wheelRadius: r, spinLeft, spinRight, left, right, arrow = 0.42, running }: RobotProps) {
  const tier = useQuality((s) => s.level);
  const led = useRef<Mesh>(null);
  const light = useMemo(() => ownMaterial(P.ink[500], tier, { transparent: false }), [tier]);
  const w = r * 0.55;
  const bodyW = track - w - 0.014;
  useFrame(({ clock }) => {
    const m = led.current?.material as MeshStandardMaterial | undefined;
    if (!m) return;
    const on = running?.() && Math.sin(clock.elapsedTime * 14) > -0.3;
    m.color.set(on ? LAB.robotics.gold : P.ink[500]);
    m.emissive.set(on ? LAB.robotics.gold : P.ink[900]);
    m.emissiveIntensity = on ? 1.4 : 0;
  });
  const g = useMemo(() => chassisShapes(r, bodyW), [r, bodyW]);
  return (
    <group>
      <RoundedBox args={[bodyW, r * 1.05, 0.3]} radius={0.028} smoothness={4} position={[0, r + 0.004, -0.03]} material={kitMaterial("plastic", tier)} />
      <mesh geometry={g.black} material={kitMaterial("black", tier)} />
      <mesh geometry={g.steel} material={kitMaterial("steel", tier)} />
      <mesh geometry={g.lens} material={lensMaterial(tier)} />
      <mesh ref={led} position={[0.05, r * 1.55 + 0.02, -0.05]} material={light}>
        <sphereGeometry args={[0.012, 12, 8]} />
      </mesh>
      <Wheel3D radius={r} width={w} spin={spinLeft} position={[-track / 2, r, 0]} />
      <Wheel3D radius={r} width={w} spin={spinRight} position={[track / 2, r, 0]} />
      <SpeedArrow x={-track / 2 - 0.07} length={left * arrow} label={`${Math.round(left * 100)}%`} />
      <SpeedArrow x={track / 2 + 0.07} length={right * arrow} label={`${Math.round(right * 100)}%`} />
    </group>
  );
}

/**
 * The robot's fixed parts by material: black (bumper, brain board, sensor
 * housing, caster housing), steel (chip, corner screws, caster ball) and
 * the sensor's teal lens.
 */
function chassisShapes(r: number, bodyW: number) {
  const deck = r * 1.55;
  const black = [
    new RoundedBoxGeometry(bodyW + 0.02, 0.042, 0.045, 2, 0.018).translate(0, r * 0.75, -0.185),
    new RoundedBoxGeometry(bodyW * 0.78, 0.012, 0.16, 2, 0.005).translate(0, deck + 0.01, 0),
    latheGeometry([[0.001, 0], [0.026, 0], [0.028, 0.006], [0.028, 0.044], [0.022, 0.05], [0.001, 0.05]], 24).rotateX(-Math.PI / 2).translate(0, r * 1.05, -0.16),
    latheGeometry([[0.001, 0.02], [0.03, 0.02], [0.032, 0.03], [0.026, 0.05], [0.001, 0.052]], 20).translate(0, 0.004, 0.11),
  ];
  const screw = (x: number, z: number) => new CylinderGeometry(0.007, 0.007, 0.004, 10).translate(x, deck + 0.018, z);
  const sx = bodyW * 0.33;
  const steel = [new RoundedBoxGeometry(0.06, 0.014, 0.06, 1, 0.004).translate(-0.012, deck + 0.022, 0.01), screw(-sx, -0.065), screw(sx, -0.065), screw(-sx, 0.065), screw(sx, 0.065), new SphereGeometry(0.022, 16, 12).translate(0, 0.022, 0.11)];
  const lens = latheGeometry([[0.001, 0], [0.018, 0], [0.016, 0.006], [0.001, 0.008]], 20).rotateX(-Math.PI / 2).translate(0, r * 1.05, -0.21);
  return { black: mergeParts(black), steel: mergeParts(steel), lens };
}

const lenses = new Map<Quality, MeshStandardMaterial>();
/** The sensor's lens: teal glass with a faint glow (a sensor beam's colour, §8). */
function lensMaterial(tier: Quality): MeshStandardMaterial {
  let m = lenses.get(tier);
  if (!m) {
    m = ownMaterial(LAB.robotics.teal, tier, { emissive: LAB.robotics.teal });
    m.emissiveIntensity = 0.6;
    lenses.set(tier, m);
  }
  return m;
}

/** The ghost robot: the body and tyres in translucent teal, driving the believed path. */
export function GhostRobot3D({ track, wheelRadius: r }: { track: number; wheelRadius: number }) {
  const w = r * 0.55;
  return (
    <group>
      <RoundedBox args={[track - w - 0.014, r * 1.05, 0.3]} radius={0.028} smoothness={2} position={[0, r + 0.004, -0.03]} material={ghostMaterial()} />
      <Wheel3D radius={r} width={w} ghost position={[-track / 2, r, 0]} />
      <Wheel3D radius={r} width={w} ghost position={[track / 2, r, 0]} />
    </group>
  );
}
