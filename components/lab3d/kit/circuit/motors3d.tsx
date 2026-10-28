"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, type BufferGeometry, type Group } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { playback } from "@/components/lab/playback";
import { useQuality } from "@/lib/quality";
import { canvasTexture, decalMaterial, latheGeometry, mergeParts, MONO } from "../detail";
import { kitMaterial } from "../materials";
import { Lead } from "./parts3d";
import { BOARD_TOP } from "./space";

/*
 * Moving parts (DESIGN.md §7.5 kit, §8.2): a motor (a lathed steel can with
 * a crimped ring, a black end bell and a steel shaft) whose gold three-blade
 * fan spins with the current, and a piezo buzzer (a black lathed body with
 * its sound hole and a printed +) that shivers when it sounds. Geometry is
 * built once and shared.
 */

let motor: { can: BufferGeometry; bell: BufferGeometry; shaft: BufferGeometry; fan: BufferGeometry } | null = null;
function motorShapes() {
  if (motor) return motor;
  // Lathed along Y, then laid along X (shaft end at +X).
  const along = (g: BufferGeometry) => g.rotateZ(-Math.PI / 2);
  const r = 0.085;
  const can = along(latheGeometry([[0.03, -0.1], [r - 0.008, -0.1], [r, -0.092], [r, -0.04], [r - 0.004, -0.036], [r, -0.032], [r, 0.09], [r - 0.006, 0.1], [0.03, 0.1]], 40));
  const bell = along(latheGeometry([[0.001, -0.135], [r * 0.7, -0.135], [r * 0.9, -0.125], [r * 0.95, -0.105], [r * 0.95, -0.098]], 36));
  const shaft = along(mergeParts([new CylinderGeometry(0.026, 0.03, 0.016, 20).translate(0, 0.108, 0), new CylinderGeometry(0.012, 0.012, 0.12, 12).translate(0, 0.16, 0)]));
  // Three pitched blades round a hub, in the fan's own frame (it spins about X).
  const blades = [0, 1, 2].map((i) => new RoundedBoxGeometry(0.012, 0.09, 0.05, 2, 0.005).rotateY(0.35).translate(0, 0.06, 0).rotateX((i * Math.PI * 2) / 3));
  const fan = mergeParts([...blades, new CylinderGeometry(0.022, 0.022, 0.03, 16).rotateZ(Math.PI / 2)]);
  motor = { can, bell, shaft, fan };
  return motor;
}

export function Motor3D({ half, current, powered }: { half: number; current: number; powered: boolean }) {
  const tier = useQuality((s) => s.level);
  const fan = useRef<Group>(null);
  useFrame((_, dt) => {
    const k = powered ? Math.min(1, playback.t / 0.9) : 0;
    if (fan.current) fan.current.rotation.x += Math.min(40, Math.abs(current) * 120) * k * Math.min(dt, 1 / 30);
  });
  const g = motorShapes();
  const y = BOARD_TOP + 0.11;
  return (
    <group>
      <group position={[-0.02, y, 0]}>
        <mesh geometry={g.can} material={kitMaterial("steel", tier)} />
        <mesh geometry={g.bell} material={kitMaterial("black", tier)} />
        <mesh geometry={g.shaft} material={kitMaterial("steel", tier)} />
      </group>
      <group ref={fan} position={[0.18, y, 0]}>
        <mesh geometry={g.fan} material={kitMaterial("gold", tier)} />
      </group>
      <Lead x0={-half} x1={-0.12} y1={y - 0.03} />
      <Lead x0={half} x1={-0.12} y1={y + 0.03} lift={0.14} />
    </group>
  );
}

let buzzer: BufferGeometry | null = null;
/** A piezo buzzer's body: a rounded black puck with a recessed top and a sound hole. */
function buzzerShape() {
  buzzer ??= latheGeometry([[0.001, 0], [0.104, 0], [0.11, 0.006], [0.11, 0.05], [0.104, 0.058], [0.04, 0.058], [0.034, 0.052], [0.014, 0.052], [0.012, 0.04], [0.001, 0.04]], 40).translate(0, BOARD_TOP + 0.01, 0);
  return buzzer;
}

export function Buzzer3D({ half, current, powered }: { half: number; current: number; powered: boolean }) {
  const tier = useQuality((s) => s.level);
  const body = useRef<Group>(null);
  useFrame((state) => {
    const on = powered && Math.abs(current) > 0.001 && playback.t > 0.4;
    if (body.current) body.current.position.x = on ? Math.sin(state.clock.elapsedTime * 90) * 0.004 : 0;
  });
  const plus = canvasTexture("buzzer-plus", 64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 48px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("+", w / 2, h / 2 + 2);
  });
  return (
    <group>
      <group ref={body}>
        <mesh geometry={buzzerShape()} material={kitMaterial("black", tier)} />
        <mesh position={[-0.068, BOARD_TOP + 0.0685, 0.02]} rotation={[-Math.PI / 2, 0, 0]} material={decalMaterial("buzzer-plus", plus, 0.9)}>
          <planeGeometry args={[0.04, 0.04]} />
        </mesh>
      </group>
      <Lead x0={-half} x1={-0.06} y1={BOARD_TOP + 0.04} />
      <Lead x0={half} x1={0.06} y1={BOARD_TOP + 0.04} />
    </group>
  );
}
