"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { BoxGeometry, Color, CylinderGeometry, MeshBasicMaterial, PlaneGeometry, type Group, type Mesh } from "three";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { canvasTexture, decalMaterial, latheGeometry, mergeParts, SANS } from "../../detail";
import { kitMaterial, ownMaterial } from "../../materials";
import { TextBoard } from "../../TextBoard";
import type { Getter } from "../glass";

/*
 * A laboratory hot plate (DESIGN.md §7.5, §8.2): a bevelled white body on
 * rubber feet, a black ceramic top with printed heating rings that glow sand
 * gold as `power` (0–1) rises, and on the front a knurled knob that turns
 * with the power over a printed dial, beside a "HEAT" label and a light that
 * comes on when it is heating. `display`, if given, is shown on a small LCD
 * at the left of the panel. Children stand on the ceramic (y = 0.13).
 */

const TOP = 0.13;
const KNOB_R = 0.034;
/** The knob's pointer angle (radians, counter-clockwise from straight up) at off; full power turns it 4 rad clockwise. */
const DIAL_OFF = 2;
const DIAL_SWEEP = 4;
const OFF = new Color(P.white);
const ON = new Color(LAB.chemistry.gold);

/** White rings on transparent: the heating element printed under the ceramic. */
function ringsTexture() {
  return canvasTexture("hotplate-rings", 256, 256, (ctx, w) => {
    const c = w / 2;
    ctx.strokeStyle = P.white;
    for (let i = 0; i < 6; i++) {
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(c, c, 28 + i * 16, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

/** The front panel: "HEAT", and a dial of ticks round the knob from off to full. */
function frontMaterial() {
  const map = canvasTexture("hotplate-front", 512, 160, (ctx, w, h) => {
    const kx = w - 80;
    const ky = h / 2;
    ctx.fillStyle = P.ink[700];
    ctx.font = `700 40px ${SANS}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText("HEAT", 30, ky);
    for (let i = 0; i <= 8; i++) {
      // The pointer's direction at each eighth of the sweep, in canvas space (y down).
      const t = DIAL_OFF - (i / 8) * DIAL_SWEEP;
      const a = Math.atan2(-Math.cos(t), -Math.sin(t));
      const r0 = 64;
      const r1 = i % 4 === 0 ? 76 : 71;
      ctx.lineWidth = i % 4 === 0 ? 5 : 3;
      ctx.strokeStyle = P.ink[700];
      ctx.beginPath();
      ctx.moveTo(kx + Math.cos(a) * r0, ky + Math.sin(a) * r0);
      ctx.lineTo(kx + Math.cos(a) * r1, ky + Math.sin(a) * r1);
      ctx.stroke();
    }
  });
  return decalMaterial("hotplate-front", map);
}

let parts: { knob: ReturnType<typeof latheGeometry>; pointer: BoxGeometry; led: CylinderGeometry } | null = null;
function plateParts() {
  // The knob faces +z: a lathe along y turned to point out of the panel, ribbed round its edge.
  const knob = latheGeometry([[0.0005, 0], [KNOB_R, 0], [KNOB_R + 0.002, 0.006], [KNOB_R, 0.028], [KNOB_R * 0.86, 0.036], [0.0005, 0.037]], 36);
  const p = knob.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getZ(i));
    if (r < KNOB_R * 0.95 || p.getY(i) < 0.004 || p.getY(i) > 0.03) continue;
    const s = 1 + 0.035 * Math.cos(Math.atan2(p.getZ(i), p.getX(i)) * 18);
    p.setXYZ(i, p.getX(i) * s, p.getY(i), p.getZ(i) * s);
  }
  knob.rotateX(Math.PI / 2);
  knob.computeVertexNormals();
  parts = {
    knob,
    pointer: new BoxGeometry(0.006, KNOB_R * 0.7, 0.004).translate(0, KNOB_R * 0.45, 0.038),
    led: new CylinderGeometry(0.011, 0.011, 0.006, 16).rotateX(Math.PI / 2),
  };
  return parts;
}

export function HotPlate3D({ power, display, size = 0.7, position, children }: { power: Getter<number>; display?: Getter<string>; size?: number; position?: [number, number, number]; children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  const g = parts ?? plateParts();
  const dial = useRef<Group>(null);
  const rings = useRef<Mesh>(null);
  const led = useRef<Mesh>(null);
  const ringMaterial = useMemo(() => new MeshBasicMaterial({ map: ringsTexture(), color: P.white, transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }), []);
  const ledMaterial = useMemo(() => ownMaterial(P.ink[700], tier, { emissive: LAB.chemistry.gold }), [tier]);
  const hasDisplay = display !== undefined;
  const lcd = useMemo(() => (hasDisplay ? new TextBoard("screen", 0.05, 24) : null), [hasDisplay]);
  useEffect(() => () => lcd?.dispose(), [lcd]);
  const ringPlane = useMemo(() => new PlaneGeometry(size * 0.8, size * 0.8).rotateX(-Math.PI / 2), [size]);
  const feet = useMemo(() => {
    const at = size / 2 - 0.07;
    return mergeParts([-at, at].flatMap((x) => [-at, at].map((z) => new CylinderGeometry(0.03, 0.032, 0.012, 16).translate(x, 0.006, z))));
  }, [size]);
  useEffect(
    () => () => {
      ringMaterial.dispose();
      ledMaterial.dispose();
      ringPlane.dispose();
      feet.dispose();
    },
    [ringMaterial, ledMaterial, ringPlane, feet],
  );
  useFrame(() => {
    const k = Math.max(0, Math.min(1, power()));
    const m = rings.current?.material as MeshBasicMaterial | undefined;
    if (m) {
      m.color.copy(OFF).lerp(ON, Math.min(1, k * 2));
      m.opacity = 0.16 + k * 0.8;
    }
    const l = led.current?.material as typeof ledMaterial | undefined;
    if (l) l.emissiveIntensity = k > 0.01 ? 1.6 : 0;
    if (dial.current) dial.current.rotation.z = DIAL_OFF - k * DIAL_SWEEP;
    if (lcd && display) lcd.set(display());
  });
  const half = size / 2;
  return (
    <group position={position}>
      <mesh geometry={feet} material={kitMaterial("rubber", tier)} />
      <RoundedBox args={[size, 0.092, size]} radius={0.034} smoothness={4} position={[0, 0.058, 0]} material={kitMaterial("plastic", tier)} />
      <RoundedBox args={[size * 0.88, 0.03, size * 0.88]} radius={0.012} smoothness={3} position={[0, TOP - 0.015, 0]} material={kitMaterial("ink", tier)} />
      <mesh ref={rings} geometry={ringPlane} position={[0, TOP + 0.0015, 0]} material={ringMaterial} />
      <mesh position={[half * 0.32, 0.058, half + 0.0008]} material={frontMaterial()}>
        <planeGeometry args={[0.32, 0.1]} />
      </mesh>
      <group ref={dial} position={[half * 0.32 + 0.16 - (80 / 512) * 0.32, 0.058, half]} rotation={[0, 0, DIAL_OFF]}>
        <mesh geometry={g.knob} material={kitMaterial("ink", tier)} />
        <mesh geometry={g.pointer} material={kitMaterial("plastic", tier)} />
      </group>
      <mesh ref={led} geometry={g.led} position={[half * 0.32 - 0.175, 0.058, half + 0.002]} material={ledMaterial} />
      {/* Held a little off the panel: the label turns to the camera and would dip into the body at an angle. */}
      {lcd && <primitive object={lcd.sprite} position={[-half * 0.5, 0.058, half + 0.035]} />}
      <group position={[0, TOP, 0]}>{children}</group>
    </group>
  );
}
