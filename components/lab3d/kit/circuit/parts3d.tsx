"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CatmullRomCurve3, Curve, CylinderGeometry, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, TubeGeometry, Vector3, type BufferGeometry, type Group, type Material } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PropValue } from "@/engine/types";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import type { Quality } from "@/lib/quality";
import { canvasTexture, latheGeometry, mergeParts, MONO, SANS } from "../detail";
import { kitMaterial } from "../materials";
import { BOARD_TOP } from "./space";

/*
 * Circuit parts in 3D (DESIGN.md §7.5 kit, §8.2), each modelled along +X
 * around the slot centre, with its two terminals at x = ±half on the board.
 * Proportioned from real parts: AA cells (14.5 × 50.5 mm) in an open holder
 * with springs, an axial 1/4 W resistor's dog-bone body with printed colour
 * bands, insulated jumpers with bare copper ends.
 */

/** A lead: thin metal wire from a terminal (x0 on the board) up and into the part at (x1, y1). */
export function Lead({ x0, x1, y1, lift = 0.07, insulated }: { x0: number; x1: number; y1: number; lift?: number; insulated?: "gold" | "insulation" }) {
  const tier = useQuality((s) => s.level);
  const geometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3([new Vector3(x0, BOARD_TOP, 0), new Vector3(x0, BOARD_TOP + lift, 0), new Vector3(x1, y1, 0)], false, "catmullrom", 0.1), 20, insulated ? 0.0095 : 0.007, 10, false), [x0, x1, y1, lift, insulated]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={kitMaterial(insulated ?? "steel", tier)} />;
}

// ---- Battery: AA cells in an open holder ----

const CELL_L = 0.32;
const CELL_R = 0.045;

/** The cell's printed sleeve: white with a gold band at the + end, "AA" along its length. */
function sleeveMaterial(tier: Quality): Material {
  const map = canvasTexture("aa-sleeve", 128, 512, (ctx, w, h) => {
    ctx.fillStyle = LAB.robotics.bench;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = LAB.robotics.gold;
    ctx.fillRect(0, 0, w, h * 0.3);
    // Text runs along the cell, reading from the − end to the + end.
    ctx.save();
    ctx.translate(w * 0.5, h * 0.64);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = LAB.robotics.trim;
    ctx.font = `800 30px ${SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Just "AA": the pack's one voltage (the simulator's) is printed on the holder, so the bench never shows two numbers.
    ctx.fillText("AA", 0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(w * 0.5, h * 0.15);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = LAB.robotics.trim;
    ctx.font = `800 40px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("+", 0, 0);
    ctx.restore();
  });
  const o = { map, roughness: 0.3, color: "#ffffff" };
  return tier === "low" ? new MeshStandardMaterial(o) : new MeshPhysicalMaterial({ ...o, clearcoat: 0.8, clearcoatRoughness: 0.2 });
}

let battery: { sleeve: BufferGeometry; ends: BufferGeometry; spring: BufferGeometry; sleeveMat: Map<Quality, Material> } | null = null;
function batteryShapes() {
  if (battery) return battery;
  // The sleeve, lathed along Y and laid along +X (+ end at +X): rounded shoulders, a seam at each end.
  const r = CELL_R;
  const L = CELL_L;
  const sleeve = latheGeometry([[r * 0.86, 0.004], [r, 0.012], [r, L - 0.012], [r * 0.86, L - 0.004]], 32).translate(0, -L / 2, 0).rotateZ(-Math.PI / 2);
  // Steel ends: the flat − cap and the + cap with its nub.
  const minus = latheGeometry([[0.001, 0], [r * 0.86, 0], [r * 0.86, 0.006]], 28).translate(0, -L / 2, 0).rotateZ(-Math.PI / 2);
  const plus = latheGeometry([[r * 0.86, L - 0.006], [r * 0.86, L], [r * 0.38, L], [r * 0.36, L + 0.012], [0.001, L + 0.013]], 28).translate(0, -L / 2, 0).rotateZ(-Math.PI / 2);
  const ends = mergeGeometries([minus, plus])!;
  // The spring at the − end: a short steel coil.
  const spring = new TubeGeometry(new Helix(-L / 2 - 0.012, r * 0.62), 90, 0.0035, 6, false);
  battery = { sleeve, ends, spring, sleeveMat: new Map() };
  return battery;
}

/** A short coil spring along −X from x0, 4.5 turns. */
class Helix extends Curve<Vector3> {
  constructor(
    private x0: number,
    private radius: number,
  ) {
    super();
  }
  getPoint(t: number, out = new Vector3()) {
    const a = t * Math.PI * 2 * 4.5;
    return out.set(this.x0 - t * 0.024, Math.sin(a) * this.radius, Math.cos(a) * this.radius);
  }
}

/** The open holder: a base and four walls in matte black, one geometry for any number of cells. */
function holderGeometry(cells: number): BufferGeometry {
  const w = CELL_L + 0.07;
  const d = cells * CELL_R * 2 + 0.028;
  return mergeGeometries([
    new RoundedBoxGeometry(w, 0.016, d, 2, 0.006).translate(0, 0.008, 0),
    new RoundedBoxGeometry(w, 0.05, 0.01, 2, 0.004).translate(0, 0.025, d / 2 - 0.005),
    new RoundedBoxGeometry(w, 0.05, 0.01, 2, 0.004).translate(0, 0.025, -d / 2 + 0.005),
    new RoundedBoxGeometry(0.012, 0.06, d, 2, 0.005).translate(w / 2 - 0.006, 0.03, 0),
    new RoundedBoxGeometry(0.012, 0.06, d, 2, 0.005).translate(-w / 2 + 0.006, 0.03, 0),
  ])!;
}

/** The + and − printed on the board by the battery's ends, so "which leg faces the battery's plus side?" can be answered by looking. */
function poleMaterial(sign: "+" | "−"): Material {
  const map = canvasTexture(`pole-${sign}`, 96, 96, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = sign === "+" ? LAB.robotics.gold : LAB.robotics.trim;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sign === "+" ? LAB.robotics.trim : LAB.robotics.bench;
    ctx.font = `800 70px ${SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sign, w / 2, h / 2 + 4);
  });
  return new MeshBasicMaterial({ map, transparent: true, depthWrite: false });
}
const poles = new Map<string, Material>();
const pole = (sign: "+" | "−") => {
  let m = poles.get(sign);
  if (!m) poles.set(sign, (m = poleMaterial(sign)));
  return m;
};

const packMats = new Map<string, Material>();
/** The pack's total voltage printed on the holder's front wall, so two 1.5 V cells plainly make the simulator's 3 V. */
function packLabelMaterial(volts: number, tier: Quality): Material {
  const key = `${volts}|${tier}`;
  let m = packMats.get(key);
  if (!m) {
    const map = canvasTexture(`pack-${volts}`, 256, 64, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = LAB.robotics.gold;
      ctx.font = `700 46px ${MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${volts} V`, w / 2, h / 2 + 2);
    });
    m = new MeshStandardMaterial({ map, transparent: true, roughness: 0.55, metalness: 0.2, depthWrite: false });
    packMats.set(key, m);
  }
  return m;
}

/**
 * The battery pack. Its + is terminal a (the slot's −x end), as the simulator
 * has it (engine/circuits/parts.ts), or terminal b when `flipped`: the gold
 * lead, the printed + and the front cell's gold-banded end all sit there, so
 * what the board shows always agrees with the run.
 */
export function Battery3D({ half, volts, flipped = false }: { half: number; volts: number; flipped?: boolean }) {
  const tier = useQuality((s) => s.level);
  const cells = Math.max(1, Math.min(4, Math.round(volts / 1.5)));
  const b = batteryShapes();
  let sleeve = b.sleeveMat.get(tier);
  if (!sleeve) {
    sleeve = sleeveMaterial(tier);
    b.sleeveMat.set(tier, sleeve);
  }
  const holder = useMemo(() => holderGeometry(cells), [cells]);
  useEffect(() => () => holder.dispose(), [holder]);
  const y = BOARD_TOP + CELL_R + 0.016;
  const w = CELL_L + 0.07;
  // Which way + lies along the slot: −x (terminal a), or +x when flipped.
  const plus = flipped ? 1 : -1;
  return (
    <group>
      <mesh geometry={holder} position={[0, BOARD_TOP, 0]} material={kitMaterial("black", tier)} />
      <mesh position={[0, BOARD_TOP + 0.028, (cells * CELL_R * 2 + 0.028) / 2 + 0.0008]} material={packLabelMaterial(volts, tier)}>
        <planeGeometry args={[0.16, 0.04]} />
      </mesh>
      {Array.from({ length: cells }, (_, i) => {
        const z = (i - (cells - 1) / 2) * CELL_R * 2;
        // Cells sit head to tail, the way a holder wires them in series; the front one's + end (the sleeve's +X) faces the pack's +.
        const towardPlus = (cells - 1 - i) % 2 === 0;
        return (
          <group key={i} position={[0, y, z]} rotation={[0, towardPlus === (plus > 0) ? 0 : Math.PI, 0]}>
            <mesh geometry={b.sleeve} material={sleeve} />
            <mesh geometry={b.ends} material={kitMaterial("steel", tier)} />
            <mesh geometry={b.spring} material={kitMaterial("steel", tier)} />
          </group>
        );
      })}
      <Lead x0={-plus * half} x1={(-plus * w) / 2} y1={BOARD_TOP + 0.03} insulated="insulation" />
      <Lead x0={plus * half} x1={(plus * w) / 2} y1={BOARD_TOP + 0.03} insulated="gold" />
      {/* The poles, printed flat on the board in front of each end (+ is the gold lead's end). */}
      {(["−", "+"] as const).map((sign) => (
        <mesh key={sign} position={[(sign === "+" ? plus : -plus) * (w / 2 - 0.02), BOARD_TOP + 0.002, (cells * CELL_R * 2 + 0.028) / 2 + 0.06]} rotation={[-Math.PI / 2, 0, 0]} material={pole(sign)}>
          <planeGeometry args={[0.075, 0.075]} />
        </mesh>
      ))}
    </group>
  );
}

/** Colour code for a resistance: two digits, a multiplier and a gold tolerance band. */
const CODE = ["#1d1b1a", "#7a4a26", "#e0402d", "#ff8a1f", "#f4cc16", "#22a34f", "#3d63ff", "#7a52ff", "#8a8f99", "#ffffff"];
export function bandColours(ohms: number): string[] {
  const exp = Math.max(0, Math.floor(Math.log10(Math.max(10, ohms))) - 1);
  const digits = Math.round(ohms / 10 ** exp);
  return [CODE[Math.floor(digits / 10) % 10], CODE[digits % 10], CODE[Math.min(9, exp)], "#c9a227"];
}

const RES_L = 0.2;
let resistorBody: BufferGeometry | null = null;
/** The dog-bone body of an axial resistor, lathed along Y and laid along +X. */
function resistorGeometry() {
  resistorBody ??= latheGeometry(
    [[0.007, 0], [0.026, 0.006], [0.043, 0.022], [0.047, 0.042], [0.041, 0.066], [0.04, 0.1], [0.041, 0.134], [0.047, 0.158], [0.043, 0.178], [0.026, 0.194], [0.007, RES_L]],
    40,
  )
    .translate(0, -RES_L / 2, 0)
    .rotateZ(-Math.PI / 2);
  return resistorBody;
}

const resistorMats = new Map<string, Material>();
/** The body's paint with its four colour bands printed flush, cached per value and tier. */
function resistorMaterial(ohms: number, tier: Quality): Material {
  const key = `${ohms}|${tier}`;
  let m = resistorMats.get(key);
  if (!m) {
    const bands = bandColours(ohms);
    const map = canvasTexture(`resistor-${ohms}`, 16, 256, (ctx, w, h) => {
      ctx.fillStyle = "#ece4d4";
      ctx.fillRect(0, 0, w, h);
      // Along the body (v from the − lead): three value bands, a gap, the tolerance band.
      [0.3, 0.41, 0.52, 0.72].forEach((v, i) => {
        ctx.fillStyle = bands[i];
        ctx.fillRect(0, h * (1 - v - 0.045), w, h * 0.07);
      });
    });
    const o = { map, color: "#ffffff", roughness: 0.42 };
    m = tier === "low" ? new MeshStandardMaterial(o) : new MeshPhysicalMaterial({ ...o, clearcoat: 0.6, clearcoatRoughness: 0.25 });
    resistorMats.set(key, m);
  }
  return m;
}

export function Resistor3D({ half, ohms }: { half: number; ohms: number }) {
  const tier = useQuality((s) => s.level);
  const y = BOARD_TOP + 0.09;
  return (
    <group>
      <mesh geometry={resistorGeometry()} position={[0, y, 0]} material={resistorMaterial(ohms, tier)} />
      <Lead x0={-half} x1={-RES_L / 2} y1={y} />
      <Lead x0={half} x1={RES_L / 2} y1={y} />
    </group>
  );
}

/** A plain wire placed in a slot: a gold jumper with bare copper ends pushed into the board. */
export function Jumper3D({ half }: { half: number }) {
  const tier = useQuality((s) => s.level);
  const geometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3([new Vector3(-half, BOARD_TOP + 0.03, 0), new Vector3(-half * 0.8, BOARD_TOP + 0.1, 0), new Vector3(half * 0.8, BOARD_TOP + 0.1, 0), new Vector3(half, BOARD_TOP + 0.03, 0)]), 32, 0.017, 12, false), [half]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group>
      <mesh geometry={geometry} material={kitMaterial("gold", tier)} />
      {[-half, half].map((x) => (
        <mesh key={x} geometry={PIN} position={[x, BOARD_TOP + 0.005, 0]} material={kitMaterial("copper", tier)} />
      ))}
    </group>
  );
}

/** A bare copper end, pushed into the board. */
const PIN = new CylinderGeometry(0.009, 0.009, 0.05, 10);

/*
 * A knife switch (§8.2), the school-lab kind: a black base, a steel hinge
 * clip and a steel jaw, a gold blade that swings up out of the jaw to open
 * the circuit, and a black handle at its free end. Terminal screws take the
 * leads. Shared geometry: base, steel and blade are one mesh each.
 */
const KNIFE_BASE = 0.035;
let knife: { steel: BufferGeometry; blade: BufferGeometry; handle: BufferGeometry } | null = null;
function knifeShapes() {
  if (knife) return knife;
  const top = BOARD_TOP + KNIFE_BASE;
  const plate = (x: number, z: number) => new RoundedBoxGeometry(0.03, 0.06, 0.008, 2, 0.003).translate(x, top + 0.03, z);
  const screw = (x: number) => latheGeometry([[0.001, top], [0.02, top], [0.021, top + 0.006], [0.017, top + 0.012], [0.001, top + 0.013]], 20).translate(x, 0, 0);
  knife = {
    // Hinge clip at the left, jaw at the right (two plates each, the blade between), and a terminal screw beside each.
    steel: mergeParts([plate(-0.12, 0.018), plate(-0.12, -0.018), plate(0.12, 0.018), plate(0.12, -0.018), new CylinderGeometry(0.006, 0.006, 0.05, 10).rotateX(Math.PI / 2).translate(-0.12, top + 0.045, 0), screw(-0.155), screw(0.155)]),
    blade: new RoundedBoxGeometry(0.27, 0.01, 0.024, 2, 0.004).translate(0.125, 0, 0),
    handle: latheGeometry([[0.001, 0], [0.013, 0], [0.016, 0.01], [0.016, 0.036], [0.012, 0.046], [0.001, 0.048]], 20).translate(0.262, 0.004, 0),
  };
  return knife;
}

export function Switch3D({ half, props }: { half: number; props: Record<string, PropValue> }) {
  const tier = useQuality((s) => s.level);
  const lever = useRef<Group>(null);
  const closed = props.closed !== false;
  useFrame((_, dt) => {
    // The blade swings to its new position on a quick ease.
    if (lever.current) lever.current.rotation.z += ((closed ? 0 : 0.6) - lever.current.rotation.z) * Math.min(1, dt * 14);
  });
  const g = knifeShapes();
  return (
    <group>
      <RoundedBox args={[0.36, KNIFE_BASE, 0.16]} radius={0.012} smoothness={3} position={[0, BOARD_TOP + KNIFE_BASE / 2, 0]} material={kitMaterial("black", tier)} />
      <mesh geometry={g.steel} material={kitMaterial("steel", tier)} />
      <group ref={lever} position={[-0.12, BOARD_TOP + KNIFE_BASE + 0.045, 0]}>
        <mesh geometry={g.blade} material={kitMaterial("gold", tier)} />
        <mesh geometry={g.handle} material={kitMaterial("black", tier)} />
      </group>
      <Lead x0={-half} x1={-0.155} y1={BOARD_TOP + KNIFE_BASE + 0.008} />
      <Lead x0={half} x1={0.155} y1={BOARD_TOP + KNIFE_BASE + 0.008} />
    </group>
  );
}
