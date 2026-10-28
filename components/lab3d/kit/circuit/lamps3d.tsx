"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, Curve, CylinderGeometry, MeshBasicMaterial, SphereGeometry, TubeGeometry, Vector3, type BufferGeometry, type Group, type Mesh, type MeshStandardMaterial, type Sprite } from "three";
import { playback } from "@/components/lab/playback";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { corner, latheGeometry, mergeParts, shellGeometry, type Profile } from "../detail";
import { glowMaterial, kitMaterial, ownMaterial } from "../materials";
import { TextBoard } from "../TextBoard";
import { Lead } from "./parts3d";
import { BOARD_TOP } from "./space";

/*
 * Lamps (DESIGN.md §7.5, §8.1): the LED and the bulb glow with the simulator's
 * brightness as power ramps up (an emissive core plus a soft halo, normal
 * blending); a burnt LED goes dark and smoky. After a wrong run a ghost of
 * the student's prediction glows beside reality: a translucent teal copy
 * with a dashed "Your idea" label.
 */

export interface LampState {
  brightness: number;
  burnt: boolean;
}

/** A 5 mm LED's epoxy lens: flanged base with the cathode flat, a straight body, a domed top. */
let lens: BufferGeometry | null = null;
function lensGeometry() {
  if (lens) return lens;
  const g = latheGeometry([[0.001, 0], [0.068, 0], [0.069, 0.004], [0.069, 0.013], [0.058, 0.014], [0.058, 0.078], ...corner(0, 0.078, 0.058, 0, Math.PI / 2, 10).slice(1)], 40);
  // The flat on the flange marks the cathode (+X here, the short leg's side).
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < 0.0142 && p.getX(i) > 0.052) p.setX(i, 0.052);
  g.computeVertexNormals();
  lens = g;
  return g;
}
/** Inside the lens: the cathode's anvil (big) and the anode's post (thin), seen through the epoxy. */
/** The LED's head is drawn 1.4x a real 5 mm LED, so it reads at bench distance next to the battery. */
const LED_HEAD = 1.4;
const ANVIL = new BoxGeometry(0.024, 0.05, 0.008);
const POST = new BoxGeometry(0.008, 0.046, 0.006);
const GLOBE = new SphereGeometry(0.115, 32, 22);

/** How far the power has come up: over the first second of the lab's run, or from `power` (0–1) where a page drives it (the landing's scroll scene). */
function ramp(powered: boolean, power?: () => number) {
  if (!powered) return 0;
  const k = power ? Math.max(0, Math.min(1, power())) : Math.min(1, playback.t / 0.9);
  return k * k * (3 - 2 * k);
}

function describe(s: LampState) {
  return s.burnt ? "burns out" : s.brightness > 0.6 ? "glows bright" : s.brightness > 0.05 ? "glows dim" : "stays dark";
}

/** The ghost's "Your idea" line, or null when the idea and reality look the same (no ghost is drawn then). */
export function ghostIdea(ghost: LampState, real: LampState): string | null {
  const differs = Math.abs(ghost.brightness - real.brightness) > 0.08 || ghost.burnt !== real.burnt;
  return differs ? `Your idea: ${describe(ghost)}` : null;
}

/** How far beside the real lamp its ghost stands, on screen (world units). */
const GHOST_BESIDE = 0.26;
const head = new Vector3();
const right = new Vector3();

/**
 * The ghost of the prediction: a translucent teal copy of the lamp's own
 * glass (the LED's lens or the bulb's globe), glowing the way the student
 * expected, with a soft halo and a label. It stands beside the real lamp on
 * screen (to its left, whichever way the slot faces), so ghost and reality
 * read side by side; tucked behind it, it was hidden. While the part is
 * selected its inspect label carries the "Your idea" line instead
 * (`labelled` false), so two labels never stack on one part.
 */
function Ghost({ y, geometry, state, real, scale = 1.3, labelled = true }: { y: number; geometry: BufferGeometry; state: LampState; real: LampState; scale?: number; labelled?: boolean }) {
  const idea = ghostIdea(state, real);
  const group = useRef<Group>(null);
  const material = useMemo(() => new MeshBasicMaterial({ color: LAB.robotics.teal, transparent: true, opacity: 0.4, depthWrite: false }), []);
  useFrame(({ camera }) => {
    const o = group.current;
    if (!o?.parent) return;
    o.parent.localToWorld(head.set(0, y, 0));
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    o.position.copy(o.parent.worldToLocal(head.addScaledVector(right, -GHOST_BESIDE)));
  });
  // The halo ignores depth: a soft glow sunk into the bench top showed a hard edge where it met it.
  const halo = useMemo(() => Object.assign(glowMaterial(LAB.robotics.teal), { depthTest: false }), []);
  const label = useMemo(() => new TextBoard("ghost", 0.1, 22, "robotics"), []);
  useEffect(() => {
    if (idea) label.set(idea);
  }, [label, idea]);
  useEffect(() => () => label.dispose(), [label]);
  if (!idea) return null;
  return (
    <group ref={group} position={[0, y, 0]}>
      <mesh geometry={geometry} material={material} scale={scale} />
      <sprite material={halo} position={[0, 0.08, 0]} scale={0.18 + state.brightness * 0.4} onUpdate={(s: Sprite) => (s.material.opacity = state.brightness * 0.8)} />
      {labelled && <primitive object={label.sprite} position={[0, 0.26, 0]} />}
    </group>
  );
}

export function Led3D({ half, flipped, state, ghost, ghostLabel = true, powered, power }: { half: number; flipped: boolean; state: LampState; ghost: LampState | null; ghostLabel?: boolean; powered: boolean; power?: () => number }) {
  const tier = useQuality((s) => s.level);
  // Amber epoxy (Robotics' gold): clear enough to see the anvil and post inside.
  const body = useMemo(() => {
    const m = ownMaterial(LAB.robotics.gold, tier, { transparent: true, opacity: 0.74, emissive: LAB.robotics.gold });
    if ("transmission" in m) {
      m.roughness = 0.06;
      m.clearcoat = 1;
    }
    return m;
  }, [tier]);
  // Over everything, so a glow never shows a hard edge where it meets the board.
  const halo = useMemo(() => Object.assign(glowMaterial(LAB.robotics.gold), { depthTest: false }), []);
  const haloRef = useRef<Sprite>(null);
  const lensRef = useRef<Mesh>(null);
  useFrame(() => {
    const k = ramp(powered, power) * (state.burnt ? 0 : state.brightness);
    const m = lensRef.current?.material as MeshStandardMaterial | undefined;
    if (m) {
      m.emissiveIntensity = 0.05 + k * 2.6;
      m.color.set(state.burnt && powered ? "#3b2f2f" : LAB.robotics.gold);
    }
    if (haloRef.current) {
      haloRef.current.material.opacity = k * 0.85;
      haloRef.current.scale.setScalar(0.2 + k * 0.5);
    }
  });
  // Standing tall on its legs, so the long anode and the short cathode read apart from the bench camera.
  const y = BOARD_TOP + 0.22;
  return (
    // Flipped: the whole LED turns round, so the long anode leg is on the other side.
    <group rotation={[0, flipped ? Math.PI : 0, 0]}>
      <group position={[0, y, 0]} scale={LED_HEAD}>
        <mesh geometry={ANVIL} position={[0.013, 0.045, 0]} material={kitMaterial("steel", tier)} />
        <mesh geometry={POST} position={[-0.014, 0.043, 0]} material={kitMaterial("steel", tier)} />
        <mesh ref={lensRef} geometry={lensGeometry()} material={body} renderOrder={2} />
      </group>
      <sprite ref={haloRef} material={halo} position={[0, y + 0.11, 0]} />
      {/* The anode (long leg, with a kink) is on terminal a; the cathode under the flat is shorter. */}
      <Lead x0={-half} x1={-0.014 * LED_HEAD} y1={y + 0.004} lift={0.17} />
      <Lead x0={half} x1={0.014 * LED_HEAD} y1={y + 0.004} lift={0.06} />
      {/* The LED's ghost is its own lens, beside and behind the real one. */}
      {ghost && <Ghost y={y - 0.02} geometry={lensGeometry()} scale={LED_HEAD} state={ghost} real={state} labelled={ghostLabel} />}
    </group>
  );
}

/*
 * The bulb (§8.2): a pear-shaped glass envelope with real wall thickness on
 * a gold screw base with its thread, standing in a black batten holder; a
 * gold coil filament strung between two steel support wires glows with the
 * simulator's brightness. Built once and shared by every bulb.
 */
let bulb: { glass: BufferGeometry; screw: BufferGeometry; holder: BufferGeometry; supports: BufferGeometry; coil: BufferGeometry } | null = null;
/** Heights above the board: the holder's top, the screw's top (the glass's neck) and the filament. */
const HOLDER_TOP = 0.12;
const NECK = 0.185;
const FILAMENT = NECK + 0.11;

/** The filament: a fine coil strung across between the supports. */
class Coil extends Curve<Vector3> {
  constructor() {
    super();
  }
  getPoint(t: number, out = new Vector3()) {
    const a = t * Math.PI * 2 * 9;
    return out.set(-0.032 + t * 0.064, Math.sin(a) * 0.008, Math.cos(a) * 0.008);
  }
}

function bulbShapes() {
  if (bulb) return bulb;
  // The envelope, drawn top-down so the shell's rolled rim lands at the neck (hidden in the screw), then turned upright.
  const envelope: Profile = [[0, 0], [0.055, 0.012], [0.09, 0.037], [0.112, 0.072], [0.118, 0.112], [0.112, 0.147], [0.09, 0.182], [0.062, 0.21], [0.048, 0.238], [0.045, 0.262]];
  const glass = shellGeometry(envelope, 0.004, 0.0064, 48).rotateX(Math.PI).translate(0, BOARD_TOP + NECK + 0.262 - 0.004, 0);
  // The screw base: a rolled thread, five turns' worth of ridges.
  const thread: Profile = [[0.03, BOARD_TOP + HOLDER_TOP - 0.004]];
  for (let i = 0; i <= 20; i++) {
    const y = BOARD_TOP + HOLDER_TOP + (i / 20) * (NECK - HOLDER_TOP);
    thread.push([0.047 + 0.0035 * Math.sin((i / 20) * Math.PI * 10), y]);
  }
  const screw = latheGeometry(thread, 36);
  const holder = latheGeometry([[0.001, BOARD_TOP], [0.074, BOARD_TOP], [0.08, BOARD_TOP + 0.008], [0.08, BOARD_TOP + 0.055], [0.072, BOARD_TOP + 0.065], [0.058, BOARD_TOP + 0.07], [0.058, BOARD_TOP + HOLDER_TOP - 0.005], [0.052, BOARD_TOP + HOLDER_TOP], [0.03, BOARD_TOP + HOLDER_TOP]], 40);
  const support = (x: number) => new CylinderGeometry(0.0025, 0.0025, FILAMENT - NECK + 0.02, 6).translate(x, BOARD_TOP + (NECK + FILAMENT) / 2 - 0.01, 0);
  const supports = mergeParts([support(-0.032), support(0.032), new CylinderGeometry(0.012, 0.016, 0.05, 16).translate(0, BOARD_TOP + NECK + 0.015, 0)]);
  const coil = new TubeGeometry(new Coil(), 120, 0.0022, 5, false).translate(0, BOARD_TOP + FILAMENT, 0);
  bulb = { glass, screw, holder, supports, coil };
  return bulb;
}

export function Bulb3D({ half, state, ghost, ghostLabel = true, powered }: { half: number; state: LampState; ghost: LampState | null; ghostLabel?: boolean; powered: boolean }) {
  const tier = useQuality((s) => s.level);
  const coil = useMemo(() => ownMaterial(LAB.robotics.gold, tier, { emissive: LAB.robotics.gold }), [tier]);
  const halo = useMemo(() => glowMaterial(LAB.robotics.gold), []);
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
  const g = bulbShapes();
  const y = BOARD_TOP + 0.3;
  return (
    <group>
      <mesh geometry={g.holder} material={kitMaterial("black", tier)} />
      <mesh geometry={g.screw} material={kitMaterial("gold", tier)} />
      <mesh geometry={g.supports} material={kitMaterial("steel", tier)} />
      <mesh ref={coilRef} geometry={g.coil} material={coil} />
      <mesh geometry={g.glass} material={kitMaterial("glass", tier)} renderOrder={2} />
      <sprite ref={haloRef} material={halo} position={[0, y, 0]} />
      <Lead x0={-half} x1={-0.078} y1={BOARD_TOP + 0.035} />
      <Lead x0={half} x1={0.078} y1={BOARD_TOP + 0.035} />
      {ghost && <Ghost y={y} geometry={GLOBE} state={ghost} real={state} labelled={ghostLabel} />}
    </group>
  );
}
