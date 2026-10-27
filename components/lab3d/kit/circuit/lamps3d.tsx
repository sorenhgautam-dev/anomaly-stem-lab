"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, MeshBasicMaterial, SphereGeometry, TorusGeometry, type Mesh, type MeshStandardMaterial, type Sprite } from "three";
import { playback } from "@/components/lab/playback";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { glowMaterial, kitMaterial, ownMaterial } from "../materials";
import { TextBoard } from "../TextBoard";
import { Lead } from "./parts3d";
import { BOARD_TOP } from "./space";

/*
 * Lamps (DESIGN.md §7.5, §8.1): the LED and the bulb glow with the simulator's
 * brightness as power ramps up (an emissive core plus a soft halo, normal
 * blending); a burnt LED goes dark and smoky. After a wrong run a ghost of
 * the student's prediction glows beside reality: a translucent volt copy
 * with a dashed "Your idea" label.
 */

export interface LampState {
  brightness: number;
  burnt: boolean;
}

const DOME = new SphereGeometry(0.058, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2);
const BARREL = new CylinderGeometry(0.058, 0.058, 0.075, 28);
const RIM = new CylinderGeometry(0.068, 0.068, 0.016, 28);
const GLOBE = new SphereGeometry(0.115, 32, 22);
const COIL = new TorusGeometry(0.035, 0.008, 8, 24);
const SOCKET = new CylinderGeometry(0.055, 0.05, 0.1, 20);

function ramp(powered: boolean) {
  if (!powered) return 0;
  const k = Math.min(1, playback.t / 0.9);
  return k * k * (3 - 2 * k);
}

function describe(s: LampState) {
  return s.burnt ? "burns out" : s.brightness > 0.6 ? "glows bright" : s.brightness > 0.05 ? "glows dim" : "stays dark";
}

/** The dashed ghost of the prediction: a translucent volt copy, a halo and a label. */
function Ghost({ y, geometry, state, real }: { y: number; geometry: SphereGeometry; state: LampState; real: LampState }) {
  const differs = Math.abs(state.brightness - real.brightness) > 0.08 || state.burnt !== real.burnt;
  const material = useMemo(() => new MeshBasicMaterial({ color: P.volt[300], transparent: true, opacity: 0.32, depthWrite: false }), []);
  const halo = useMemo(() => glowMaterial(P.volt[400]), []);
  const label = useMemo(() => new TextBoard("ghost", 0.1, 22), []);
  useEffect(() => label.set(`Your idea: ${describe(state)}`), [label, state]);
  useEffect(() => () => label.dispose(), [label]);
  if (!differs) return null;
  return (
    <group position={[0, y, -0.14]}>
      <mesh geometry={geometry} material={material} scale={1.3} />
      <sprite material={halo} scale={0.2 + state.brightness * 0.6} onUpdate={(s: Sprite) => (s.material.opacity = state.brightness * 0.7)} />
      <primitive object={label.sprite} position={[0, 0.26, 0]} />
    </group>
  );
}

export function Led3D({ half, flipped, state, ghost, powered }: { half: number; flipped: boolean; state: LampState; ghost: LampState | null; powered: boolean }) {
  const tier = useQuality((s) => s.level);
  const body = useMemo(() => ownMaterial(P.flame[500], tier, { transparent: true, opacity: 0.9, emissive: P.flame[400] }), [tier]);
  const halo = useMemo(() => glowMaterial(P.flame[400]), []);
  const haloRef = useRef<Sprite>(null);
  const domeRef = useRef<Mesh>(null);
  useFrame(() => {
    const k = ramp(powered) * (state.burnt ? 0 : state.brightness);
    // The dome, barrel and rim share one material: change it through the mesh.
    const m = domeRef.current?.material as MeshStandardMaterial | undefined;
    if (m) {
      m.emissiveIntensity = k * 2.6;
      m.color.set(state.burnt && powered ? "#3b2f2f" : P.flame[500]);
    }
    if (haloRef.current) {
      haloRef.current.material.opacity = k * 0.85;
      haloRef.current.scale.setScalar(0.25 + k * 0.75);
    }
  });
  const y = BOARD_TOP + 0.2;
  return (
    // Flipped: the whole LED turns round, so the long anode leg is on the other side.
    <group rotation={[0, flipped ? Math.PI : 0, 0]}>
      <mesh geometry={RIM} position={[0, y, 0]} material={body} />
      <mesh geometry={BARREL} position={[0, y + 0.045, 0]} material={body} />
      <mesh ref={domeRef} geometry={DOME} position={[0, y + 0.083, 0]} material={body} />
      <sprite ref={haloRef} material={halo} position={[0, y + 0.07, 0]} />
      {/* The anode (long leg, with a kink) is on terminal a. */}
      <Lead x0={-half} x1={-0.025} y1={y - 0.01} lift={0.12} />
      <Lead x0={half} x1={0.025} y1={y - 0.01} lift={0.05} />
      {ghost && <Ghost y={y + 0.06} geometry={GLOBE} state={ghost} real={state} />}
    </group>
  );
}

export function Bulb3D({ half, state, ghost, powered }: { half: number; state: LampState; ghost: LampState | null; powered: boolean }) {
  const tier = useQuality((s) => s.level);
  const coil = useMemo(() => ownMaterial(P.apricot[200], tier, { emissive: P.apricot[400] }), [tier]);
  const halo = useMemo(() => glowMaterial(P.apricot[300]), []);
  const haloRef = useRef<Sprite>(null);
  const coilRef = useRef<Mesh>(null);
  useFrame(() => {
    const k = ramp(powered) * (state.burnt ? 0 : state.brightness);
    const m = coilRef.current?.material as MeshStandardMaterial | undefined;
    if (m) m.emissiveIntensity = 0.2 + k * 4;
    if (haloRef.current) {
      haloRef.current.material.opacity = k * 0.9;
      haloRef.current.scale.setScalar(0.35 + k * 1.1);
    }
  });
  const y = BOARD_TOP + 0.3;
  return (
    <group>
      <mesh geometry={SOCKET} position={[0, BOARD_TOP + 0.13, 0]} material={kitMaterial("metal", tier)} />
      <mesh geometry={GLOBE} position={[0, y, 0]} material={kitMaterial("glass", tier)} />
      <mesh ref={coilRef} geometry={COIL} position={[0, y - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} material={coil} />
      <sprite ref={haloRef} material={halo} position={[0, y, 0]} />
      <Lead x0={-half} x1={-0.04} y1={BOARD_TOP + 0.09} />
      <Lead x0={half} x1={0.04} y1={BOARD_TOP + 0.09} />
      {ghost && <Ghost y={y} geometry={GLOBE} state={ghost} real={state} />}
    </group>
  );
}
