"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CircleGeometry, CylinderGeometry, MeshBasicMaterial, Shape, ShapeGeometry, type BufferGeometry, type Group } from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import type { Getter } from "../glass";
import { Readout } from "../instruments";
import { TONE } from "../heat/tones";
import { canvasTexture, corner, latheGeometry, mergeParts, MONO, type Profile } from "../../detail";
import { kitMaterial } from "../../materials";

/*
 * A round pressure gauge (DESIGN.md §7.5, §8.2): a lathed white case with a
 * rolled steel bezel, a printed dial (a tick every 10 kPa, numbered every
 * 50, over a 270° sweep), a tapered ink needle with a counterweight under a
 * domed glass lens, a steel port on its left side for the syringe, and a
 * small screen with the number. After a wrong run a translucent teal needle
 * points where the student expected it. It faces +z.
 */

const SWEEP = (Math.PI * 3) / 2;

/** Needle angle (radians about z, 0 = straight up) for a pressure. */
const angle = (kpa: number, max: number) => SWEEP / 2 - Math.max(0, Math.min(1, kpa / max)) * SWEEP;

/** The dial face: white, ticks and numbers in ink, "kPa" under the hub. */
function dialMap(max: number) {
  return canvasTexture(`gauge-dial-${max}`, 512, 512, (ctx, w) => {
    const c = w / 2;
    ctx.fillStyle = P.white;
    ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = P.ink[900];
    ctx.fillStyle = P.ink[900];
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let v = 0; v <= max; v += 10) {
      const t = angle(v, max);
      // Direction of the needle at this pressure, in canvas space (y down).
      const dx = -Math.sin(t);
      const dy = -Math.cos(t);
      const major = v % 50 === 0;
      const r0 = major ? 196 : 210;
      ctx.lineWidth = major ? 7 : 3;
      ctx.beginPath();
      ctx.moveTo(c + dx * r0, c + dy * r0);
      ctx.lineTo(c + dx * 236, c + dy * 236);
      ctx.stroke();
      if (major && v % 100 === 0) {
        ctx.font = `600 40px ${MONO}`;
        ctx.fillText(String(v), c + dx * 154, c + dy * 154);
      }
    }
    ctx.font = `600 30px ${MONO}`;
    ctx.fillStyle = P.ink[500];
    ctx.fillText("kPa", c, c + 76);
  });
}

/** A tapered needle from a short counterweighted tail to its tip, length `l`. */
function needleShape(l: number): BufferGeometry {
  const s = new Shape();
  s.moveTo(-0.012, -l * 0.2);
  s.lineTo(0.012, -l * 0.2);
  s.lineTo(0.007, 0);
  s.lineTo(0.0025, l);
  s.lineTo(-0.0025, l);
  s.lineTo(-0.007, 0);
  s.closePath();
  return mergeParts([new ShapeGeometry(s), new CircleGeometry(0.022, 24).translate(0, -l * 0.2, 0)]);
}

function gaugeShapes(radius: number) {
  const r = radius;
  // Lathes along +y, turned so +y faces +z (towards the camera).
  const face = (g: BufferGeometry) => g.rotateX(Math.PI / 2);
  const caseProfile: Profile = [[0.0005, -0.05], [r * 0.9, -0.05], ...corner(r * 0.9, -0.03, 0.02, -Math.PI / 2, 0, 5).slice(1), [r * 0.92, 0.02], [r * 0.9, 0.03]];
  // A rolled bead: out along the back, up the outside, over the front and in (that order keeps its faces outward).
  const bezel: Profile = [[r * 0.9, 0.004], ...corner(r * 0.96, 0.034, 0.03, -Math.PI / 2, Math.PI * 0.9, 10), [r * 0.88, 0.046]];
  const lens: Profile = [[0.0005, 0.07], [r * 0.45, 0.068], [r * 0.75, 0.06], [r * 0.9, 0.048]];
  // The port: a hex nut set into the case at 9 o'clock and a nipple pointing -x, on the syringe's axis.
  const nut = new CylinderGeometry(0.03, 0.03, 0.03, 6).rotateZ(Math.PI / 2).translate(-r - 0.001, 0, 0);
  const nipple = new CylinderGeometry(0.014, 0.016, 0.05, 16).rotateZ(Math.PI / 2).translate(-r - 0.041, 0, 0);
  return {
    body: face(latheGeometry(caseProfile, 48)),
    steel: mergeParts([face(latheGeometry(bezel, 56)), nut, nipple, new CylinderGeometry(0.02, 0.02, 0.012, 20).rotateX(Math.PI / 2).translate(0, 0, 0.05)]),
    dial: new CircleGeometry(r * 0.9, 64).translate(0, 0, 0.032),
    lens: face(latheGeometry(lens, 48)),
    needle: needleShape(r * 0.76),
  };
}

const cache = new Map<number, ReturnType<typeof gaugeShapes>>();
const dials = new Map<number, MeshBasicMaterial>();

export function PressureGauge3D({ kpa, ghost, max = 450, radius = 0.24, position }: { kpa: Getter<number>; ghost: number | null; max?: number; radius?: number; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const needle = useRef<Group>(null);
  const g = useMemo(() => {
    let hit = cache.get(radius);
    if (!hit) {
      hit = gaugeShapes(radius);
      cache.set(radius, hit);
    }
    return hit;
  }, [radius]);
  const dial = useMemo(() => {
    let m = dials.get(max);
    if (!m) {
      m = new MeshBasicMaterial({ map: dialMap(max) });
      dials.set(max, m);
    }
    return m;
  }, [max]);
  const ghostMaterial = useMemo(() => new MeshBasicMaterial({ color: TONE.ghost, transparent: true, opacity: 0.6, depthWrite: false }), []);
  useEffect(() => () => ghostMaterial.dispose(), [ghostMaterial]);

  useFrame(() => {
    if (needle.current) needle.current.rotation.z = angle(kpa(), max);
  });

  return (
    <group position={position}>
      <mesh geometry={g.body} material={kitMaterial("plastic", tier)} />
      <mesh geometry={g.dial} material={dial} />
      {ghost !== null && <mesh geometry={g.needle} material={ghostMaterial} position={[0, 0, 0.038]} rotation={[0, 0, angle(ghost, max)]} />}
      <group ref={needle} position={[0, 0, 0.042]}>
        <mesh geometry={g.needle} material={kitMaterial("ink", tier)} />
      </group>
      <mesh geometry={g.steel} material={kitMaterial("steel", tier)} />
      <mesh geometry={g.lens} material={kitMaterial("glass", tier)} renderOrder={2} />
      {/* Fixed width, so the screen's board keeps one size as the reading changes. */}
      <Readout text={() => `${kpa().toFixed(1).padStart(5)} kPa`} style="screen" height={0.09} position={[0, -radius * 0.45, 0.08]} />
    </group>
  );
}
