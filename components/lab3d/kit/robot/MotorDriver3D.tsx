"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { BoxGeometry, type BufferGeometry, type Mesh, type MeshStandardMaterial } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { canvasTexture, decalMaterial, latheGeometry, mergeParts, MONO } from "../detail";
import { kitMaterial, ownMaterial } from "../materials";
import type { Getter } from "../chem/glass";

/*
 * A motor driver board (DESIGN.md §7.5 kit, §8.2): the switch the PWM
 * controller flicks on and off. A black board printed with gold pads and
 * traces and white labels, its driver chip on steel legs, a finned heat
 * sink, a teal screw-terminal block (where the current goes in and out) and
 * a status light that glows gold while the supply is switched on (`on`,
 * read every frame).
 */

const TOP = 0.03;

/** The board's printing: gold traces and pads, white labels. */
function boardPrint() {
  return canvasTexture("driver-board", 360, 300, (ctx, w, h) => {
    const px = (x: number) => (x / 0.36 + 0.5) * w;
    const pz = (z: number) => (z / 0.3 + 0.5) * h;
    ctx.strokeStyle = LAB.robotics.gold;
    ctx.fillStyle = LAB.robotics.gold;
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    // Traces from the chip's legs to the terminals and the light.
    for (const [x0, x1] of [[-0.075, -0.1], [-0.05, -0.03], [-0.03, 0.04], [-0.005, 0.11]]) {
      ctx.beginPath();
      ctx.moveTo(px(x0), pz(-0.035));
      ctx.lineTo(px(x0), pz(-0.06));
      ctx.lineTo(px(x1), pz(-0.08));
      ctx.lineTo(px(x1), pz(-0.1));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(px(-0.075), pz(0.075));
    ctx.lineTo(px(-0.13), pz(0.1));
    ctx.stroke();
    for (const [x, z] of [[-0.15, 0.12], [0.15, 0.12], [-0.15, -0.13], [0.15, -0.13]]) {
      ctx.beginPath();
      ctx.arc(px(x), pz(z), 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = LAB.robotics.bench;
    ctx.font = `600 15px ${MONO}`;
    ctx.textAlign = "center";
    ctx.fillText("PWM", px(-0.13), pz(0.135));
    ctx.fillText("IN       OUT", px(0), pz(-0.07) - 18);
  });
}

let parts: { legs: BufferGeometry; fins: BufferGeometry; screws: BufferGeometry; light: BufferGeometry } | null = null;
function driverShapes() {
  if (parts) return parts;
  const legs: BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) legs.push(new BoxGeometry(0.008, 0.014, 0.022).translate(-0.075 + i * 0.014, TOP + 0.007, 0.02 + s * 0.055));
  const fins = [new RoundedBoxGeometry(0.11, 0.014, 0.13, 1, 0.004).translate(0.09, TOP + 0.007, -0.03)];
  for (let i = 0; i < 6; i++) fins.push(new RoundedBoxGeometry(0.008, 0.08, 0.13, 1, 0.003).translate(0.042 + i * 0.019, TOP + 0.054, -0.03));
  const screws = [-0.105, -0.035, 0.035, 0.105].map((x) => latheGeometry([[0.001, 0], [0.014, 0], [0.015, 0.004], [0.012, 0.008], [0.001, 0.009]], 16).translate(x, TOP + 0.05, -0.115));
  parts = {
    legs: mergeParts(legs),
    fins: mergeParts(fins),
    screws: mergeParts(screws),
    light: latheGeometry([[0.001, 0], [0.016, 0], [0.016, 0.008], [0.012, 0.016], [0.001, 0.019]], 16),
  };
  return parts;
}

export function MotorDriver3D({ on, position }: { on: Getter<boolean>; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const led = useRef<Mesh>(null);
  const light = useMemo(() => ownMaterial(P.ink[500], tier, { transparent: false }), [tier]);
  useFrame(() => {
    const m = led.current?.material as MeshStandardMaterial | undefined;
    if (!m) return;
    const lit = on();
    m.color.set(lit ? LAB.robotics.gold : P.ink[500]);
    m.emissive.set(lit ? LAB.robotics.gold : P.ink[900]);
    m.emissiveIntensity = lit ? 1.4 : 0;
  });
  const g = driverShapes();
  return (
    <group position={position}>
      <RoundedBox args={[0.36, TOP, 0.3]} radius={0.012} smoothness={3} position={[0, TOP / 2, 0]} material={kitMaterial("black", tier)} />
      <mesh position={[0, TOP + 0.0006, 0]} rotation={[-Math.PI / 2, 0, 0]} material={decalMaterial("driver-board", boardPrint())}>
        <planeGeometry args={[0.36, 0.3]} />
      </mesh>
      <RoundedBox args={[0.1, 0.022, 0.1]} radius={0.006} smoothness={2} position={[-0.04, TOP + 0.013, 0.02]} material={kitMaterial("ink", tier)} />
      <mesh geometry={g.legs} material={kitMaterial("steel", tier)} />
      <mesh geometry={g.fins} material={kitMaterial("metal", tier)} />
      <RoundedBox args={[0.3, 0.05, 0.05]} radius={0.01} smoothness={2} position={[0, TOP + 0.025, -0.115]} material={kitMaterial("teal", tier)} />
      <mesh geometry={g.screws} material={kitMaterial("steel", tier)} />
      <mesh ref={led} geometry={g.light} position={[-0.13, TOP, 0.1]} material={light} />
    </group>
  );
}
