"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, ExtrudeGeometry, Path, Shape, type Group } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality } from "@/lib/quality";
import { latheGeometry, mergeParts } from "../detail";
import { kitMaterial } from "../materials";
import type { Getter } from "../chem/glass";

/*
 * A spur gear for the robot kit (DESIGN.md §7.5, §8.2): a true involute
 * tooth outline (20° pressure angle, so the flanks curve like a real gear's)
 * extruded with a soft bevel, a raised hub, an axle hole, round lightening
 * holes on bigger gears and a contrasting stripe from the hub, so its
 * turning is easy to follow. Every gear shares one tooth size (`module`),
 * so any two mesh: pitch radius = module × teeth / 2. Tooth 0 points along
 * +X; `angle` (radians, + = counter-clockwise seen from the front) turns it.
 */

export const GEAR_MODULE = 0.026;
export const GEAR_THICKNESS = 0.06;

export const pitchRadius = (teeth: number, module = GEAR_MODULE) => (module * teeth) / 2;

const PRESSURE = (20 * Math.PI) / 180;
const FLANK_STEPS = 6;

/** The involute function: how far a tooth's flank has turned by the time it reaches a given pressure angle. */
const inv = (a: number) => Math.tan(a) - a;

function gearGeometry(teeth: number, module: number, thickness: number): ExtrudeGeometry {
  const r = pitchRadius(teeth, module);
  const base = r * Math.cos(PRESSURE);
  const tip = r + module;
  const root = r - module * 1.25;
  const pitch = (2 * Math.PI) / teeth;
  // Half a tooth's angular width at radius ρ (measured from its centre line); radial below the base circle.
  const half = (rho: number) => Math.PI / (2 * teeth) + inv(PRESSURE) - inv(Math.acos(base / Math.max(rho, base)));
  const flank: number[] = [root];
  if (base > root) flank.push(base);
  for (let k = 1; k <= FLANK_STEPS; k++) flank.push(Math.max(root, base) + ((tip - Math.max(root, base)) * k) / FLANK_STEPS);
  const shape = new Shape();
  const at = (rho: number, a: number, first = false) => (first ? shape.moveTo(rho * Math.cos(a), rho * Math.sin(a)) : shape.lineTo(rho * Math.cos(a), rho * Math.sin(a)));
  for (let i = 0; i < teeth; i++) {
    const c = i * pitch;
    // Up the leading flank, across the tip, down the trailing flank, then along the root to the next tooth.
    flank.forEach((rho, k) => at(rho, c - half(rho), i === 0 && k === 0));
    for (let k = 1; k < 3; k++) at(tip, c - half(tip) + ((2 * half(tip)) * k) / 3);
    [...flank].reverse().forEach((rho) => at(rho, c + half(rho)));
    const gapFrom = c + half(root);
    const gapTo = c + pitch - half(root);
    for (let k = 1; k < 3; k++) at(root, gapFrom + ((gapTo - gapFrom) * k) / 3);
  }
  shape.closePath();
  const axle = new Path();
  axle.absarc(0, 0, module * 0.8, 0, Math.PI * 2, true);
  shape.holes.push(axle);
  const hub = module * 2.4;
  if (root - hub > 0.1) {
    const n = teeth >= 28 ? 6 : 4;
    const rc = (hub + root) / 2;
    const hr = Math.min((root - hub) * 0.3, rc * Math.sin(Math.PI / n) * 0.62);
    for (let k = 0; k < n; k++) {
      const a = ((k + 0.5) / n) * Math.PI * 2;
      const hole = new Path();
      hole.absarc(rc * Math.cos(a), rc * Math.sin(a), hr, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
  }
  const g = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.004, bevelSegments: 2, curveSegments: 10 });
  return g.translate(0, 0, -thickness / 2);
}

type GearLook = "plastic" | "gold" | "black";

export function Gear3D({ teeth, color = "plastic", stripe = "black", angle, phase = 0, position }: { teeth: number; color?: GearLook; stripe?: GearLook; angle: Getter<number>; phase?: number; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const spin = useRef<Group>(null);
  const parts = useMemo(() => {
    const r = pitchRadius(teeth);
    const hub = GEAR_MODULE * 2.4;
    const len = r - GEAR_MODULE * 1.25 - hub - 0.012;
    // The hub stands proud of both faces, a ring round the axle.
    const boss = latheGeometry([[GEAR_MODULE * 0.8, -GEAR_THICKNESS / 2 - 0.012], [hub - 0.004, -GEAR_THICKNESS / 2 - 0.012], [hub, -GEAR_THICKNESS / 2 - 0.008], [hub, GEAR_THICKNESS / 2 + 0.008], [hub - 0.004, GEAR_THICKNESS / 2 + 0.012], [GEAR_MODULE * 0.8, GEAR_THICKNESS / 2 + 0.012]], 32).rotateX(Math.PI / 2);
    return {
      body: mergeParts([gearGeometry(teeth, GEAR_MODULE, GEAR_THICKNESS), boss]),
      cap: new CylinderGeometry(hub * 0.62, hub * 0.62, GEAR_THICKNESS + 0.034, 24).rotateX(Math.PI / 2),
      stripe: new RoundedBoxGeometry(Math.max(0.02, len), GEAR_MODULE * 1.1, 0.012, 2, 0.004).translate(hub + Math.max(0.02, len) / 2, 0, GEAR_THICKNESS / 2 + 0.008),
    };
  }, [teeth]);
  useEffect(() => () => Object.values(parts).forEach((g) => g.dispose()), [parts]);
  useFrame(() => {
    if (spin.current) spin.current.rotation.z = phase + angle();
  });
  return (
    <group position={position}>
      <group ref={spin}>
        <mesh geometry={parts.body} material={kitMaterial(color, tier)} />
        <mesh geometry={parts.stripe} material={kitMaterial(stripe, tier)} />
      </group>
      <mesh geometry={parts.cap} material={kitMaterial("steel", tier)} />
    </group>
  );
}
