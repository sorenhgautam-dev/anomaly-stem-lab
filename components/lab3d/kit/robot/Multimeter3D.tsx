"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { BoxGeometry, type BufferGeometry } from "three";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { canvasTexture, decalMaterial, latheGeometry, MONO } from "../detail";
import { kitMaterial } from "../materials";
import type { Getter } from "../chem/glass";
import { Lcd } from "./Lcd";

/*
 * A multimeter (DESIGN.md §7.5 kit "multimeter", §8.2): a black rubber
 * holster round a white face printed with the range dial and port labels,
 * a bezelled LCD with gold digits that follows `reading`, a black selector
 * knob with a gold pointer, and two probe ports (COM in black, V in gold).
 * It leans back on the bench, facing +Z. `SOCKETS` are the probe ports
 * (local), for cables.
 */

export const SOCKETS: [number, number, number][] = [
  [-0.07, 0.11, 0.05],
  [0.07, 0.11, 0.05],
];

/** The face plate is 0.3 × 0.5, centred 0.3 up; the print covers it at 1 px per mm. */
const FACE = { w: 0.28, h: 0.48, y: 0.3 };
const KNOB_Y = 0.28;

/** The printed face: range marks round the knob, the ranges, and the port labels. */
function facePrint() {
  return canvasTexture("meter-face", 280, 480, (ctx, w, h) => {
    const px = (x: number) => (x / FACE.w + 0.5) * w;
    const py = (y: number) => (0.5 - (y - FACE.y) / FACE.h) * h;
    const cx = px(0);
    const cy = py(KNOB_Y);
    ctx.strokeStyle = LAB.robotics.trim;
    ctx.fillStyle = LAB.robotics.trim;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.font = `600 17px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const ranges = ["OFF", "V", "mV", "A", "mA", "R", "~"];
    ranges.forEach((label, i) => {
      const a = -Math.PI * 0.95 + (i / (ranges.length - 1)) * Math.PI * 0.9;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      ctx.beginPath();
      ctx.moveTo(cx + c * 70, cy + s * 70);
      ctx.lineTo(cx + c * 80, cy + s * 80);
      ctx.stroke();
      ctx.fillStyle = label === "V" ? LAB.robotics.gold : LAB.robotics.trim;
      ctx.fillText(label, cx + c * 98, cy + s * 98);
    });
    // The V range is the one in use: a gold arc under its mark.
    ctx.strokeStyle = LAB.robotics.gold;
    ctx.lineWidth = 6;
    ctx.beginPath();
    const v = -Math.PI * 0.95 + (1 / 6) * Math.PI * 0.9;
    ctx.arc(cx, cy, 64, v - 0.12, v + 0.12);
    ctx.stroke();
    ctx.fillStyle = P.ink[500];
    ctx.font = `600 16px ${MONO}`;
    for (const [i, label] of ["COM", "V"].entries()) ctx.fillText(label, px(SOCKETS[i][0]), py(SOCKETS[i][1]) - 34);
  });
}

let parts: { knob: BufferGeometry; pointer: BufferGeometry; port: BufferGeometry } | null = null;
function meterShapes() {
  // A knurled-edge knob and the ports' rings, lathed and stood facing +Z.
  parts ??= {
    knob: latheGeometry([[0.001, 0], [0.062, 0], [0.064, 0.004], [0.064, 0.02], [0.058, 0.028], [0.001, 0.028]], 36).rotateX(Math.PI / 2),
    pointer: new BoxGeometry(0.012, 0.07, 0.006),
    port: latheGeometry([[0.009, 0.004], [0.009, 0], [0.022, 0], [0.024, 0.008], [0.02, 0.014], [0.009, 0.014], [0.009, 0.004], [0.001, 0.004]], 24).rotateX(Math.PI / 2),
  };
  return parts;
}

export function Multimeter3D({ reading, unit, position, rotation }: { reading: Getter<string>; unit: string; position?: [number, number, number]; rotation?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const lcd = useMemo(() => new Lcd(unit), [unit]);
  useEffect(() => () => lcd.dispose(), [lcd]);
  useFrame(() => lcd.draw(reading()));
  const g = meterShapes();
  return (
    <group position={position} rotation={rotation}>
      <group rotation={[-0.45, 0, 0]} position={[0, 0.03, 0]}>
        <RoundedBox args={[0.36, 0.58, 0.09]} radius={0.04} smoothness={4} position={[0, 0.29, 0]} material={kitMaterial("matte", tier, LAB.robotics.trim)} />
        <RoundedBox args={[0.3, 0.5, 0.02]} radius={0.009} smoothness={3} position={[0, FACE.y, 0.045]} material={kitMaterial("matte", tier, LAB.robotics.bench)} />
        <mesh position={[0, FACE.y, 0.0556]} material={decalMaterial("meter-face", facePrint())}>
          <planeGeometry args={[FACE.w, FACE.h]} />
        </mesh>
        <RoundedBox args={[0.27, 0.105, 0.008]} radius={0.003} smoothness={2} position={[0, 0.46, 0.057]} material={kitMaterial("black", tier)} />
        <mesh position={[0, 0.46, 0.0615]}>
          <planeGeometry args={[0.25, 0.083]} />
          <meshBasicMaterial map={lcd.texture} toneMapped={false} />
        </mesh>
        <mesh geometry={g.knob} position={[0, KNOB_Y, 0.055]} material={kitMaterial("black", tier)} />
        <mesh geometry={g.pointer} position={[-0.022, KNOB_Y + 0.016, 0.085]} rotation={[0, 0, 0.94]} material={kitMaterial("gold", tier)} />
        {SOCKETS.map((p, i) => (
          <mesh key={i} geometry={g.port} position={[p[0], p[1], 0.055]} material={kitMaterial(i ? "gold" : "black", tier)} />
        ))}
      </group>
    </group>
  );
}
