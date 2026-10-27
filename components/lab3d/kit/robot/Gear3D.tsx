"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Path, Shape, type Group } from "three";
import { useQuality } from "@/lib/quality";
import { kitMaterial } from "../materials";
import type { Getter } from "../chem/glass";

/*
 * A spur gear for the robot kit (DESIGN.md §7.5, §8 toy-like glossy plastic):
 * a toothed outline extruded with a soft bevel, an axle hole, round
 * lightening holes on bigger gears and a contrasting stripe from the hub, so
 * its turning is easy to follow. Every gear shares one tooth size (`module`),
 * so any two mesh: pitch radius = module × teeth / 2. Tooth 0 points along
 * +X; `angle` (radians, + = counter-clockwise seen from the front) turns it.
 */

export const GEAR_MODULE = 0.026;
export const GEAR_THICKNESS = 0.06;

export const pitchRadius = (teeth: number, module = GEAR_MODULE) => (module * teeth) / 2;

const PROFILE: [number, number][] = [
  [-0.5, 0],
  [-0.3, 0],
  [-0.17, 1],
  [0.17, 1],
  [0.3, 0],
];

function gearGeometry(teeth: number, module: number, thickness: number): ExtrudeGeometry {
  const r = pitchRadius(teeth, module);
  const tip = r + module;
  const root = r - module * 1.25;
  const pitch = (2 * Math.PI) / teeth;
  const shape = new Shape();
  for (let i = 0; i < teeth; i++) {
    for (const [f, high] of PROFILE) {
      const a = (i + f) * pitch;
      const rad = high ? tip : root;
      if (i === 0 && f === PROFILE[0][0]) shape.moveTo(rad * Math.cos(a), rad * Math.sin(a));
      else shape.lineTo(rad * Math.cos(a), rad * Math.sin(a));
    }
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

export function Gear3D({ teeth, color = "plastic", stripe = "orange", angle, phase = 0, position }: { teeth: number; color?: "plastic" | "orange"; stripe?: "plastic" | "orange" | "ink"; angle: Getter<number>; phase?: number; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const spin = useRef<Group>(null);
  const parts = useMemo(() => {
    const r = pitchRadius(teeth);
    const hub = GEAR_MODULE * 2.4;
    const len = r - GEAR_MODULE * 1.25 - hub - 0.012;
    return {
      body: gearGeometry(teeth, GEAR_MODULE, GEAR_THICKNESS),
      cap: new CylinderGeometry(hub * 0.8, hub * 0.8, GEAR_THICKNESS + 0.03, 20).rotateX(Math.PI / 2),
      stripe: new BoxGeometry(Math.max(0.02, len), GEAR_MODULE * 1.1, 0.012).translate(hub + Math.max(0.02, len) / 2, 0, GEAR_THICKNESS / 2 + 0.008),
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
      <mesh geometry={parts.cap} material={kitMaterial("metal", tier)} />
    </group>
  );
}
