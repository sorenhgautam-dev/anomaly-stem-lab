"use client";

import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { CanvasTexture, SRGBColorSpace } from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { kitMaterial } from "../materials";
import { MAT, MAT_TOP, matFrame } from "./space";

/*
 * The robot arena (CLAUDE.md §3.6 "a robot arena floor with neon lane
 * lines", in the light theme of DESIGN.md §8): a white tray on the bench and
 * a dark cutting mat printed with a 10 cm grid, range rings round the start
 * cross, cream and grape lane tape and a scale bar in Geist Mono. It's symmetric left to
 * right, so nothing on it hints which way the robot will turn.
 */

const PX_PER_CM = 9;

function matTexture(): CanvasTexture {
  const w = (MAT.maxX - MAT.minX) * PX_PER_CM;
  const h = (MAT.maxY - MAT.minY) * PX_PER_CM;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const px = (x: number) => (x - MAT.minX) * PX_PER_CM;
  const py = (y: number) => (MAT.maxY - y) * PX_PER_CM;
  const texture = new CanvasTexture(c);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  const draw = () => {
    ctx.fillStyle = P.ink[700];
    ctx.fillRect(0, 0, w, h);
    // 10 cm grid, a little stronger on the start axes.
    for (let x = Math.ceil(MAT.minX / 10) * 10; x <= MAT.maxX; x += 10) {
      ctx.fillStyle = x === 0 ? P.ink[300] : `${P.ink[500]}cc`;
      ctx.fillRect(px(x) - (x === 0 ? 1.5 : 1), 0, x === 0 ? 3 : 2, h);
    }
    for (let y = Math.ceil(MAT.minY / 10) * 10; y <= MAT.maxY; y += 10) {
      ctx.fillStyle = y === 0 ? P.ink[300] : `${P.ink[500]}cc`;
      ctx.fillRect(0, py(y) - (y === 0 ? 1.5 : 1), w, y === 0 ? 3 : 2);
    }
    // Range rings round the start, every 20 cm.
    ctx.strokeStyle = P.ink[300];
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    for (let r = 20; r <= 60; r += 20) {
      ctx.beginPath();
      ctx.arc(px(0), py(0), r * PX_PER_CM, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Lane tape: a cream outer border and a grape inner lane (volt is kept for the ghost, apricot for the trail).
    const inset = 3 * PX_PER_CM;
    ctx.strokeStyle = P.cream[100];
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.roundRect(inset, inset, w - inset * 2, h - inset * 2, 6 * PX_PER_CM);
    ctx.stroke();
    ctx.strokeStyle = P.grape[400];
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(inset + 22, inset + 22, w - inset * 2 - 44, h - inset * 2 - 44, 5 * PX_PER_CM);
    ctx.stroke();
    // The start cross.
    ctx.strokeStyle = P.cream[100];
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(px(-5), py(0));
    ctx.lineTo(px(5), py(0));
    ctx.moveTo(px(0), py(-5));
    ctx.lineTo(px(0), py(5));
    ctx.stroke();
    // Scale bar: 10 cm.
    const bx = px(MAT.minX + 8);
    const by = py(MAT.minY + 7);
    ctx.fillStyle = P.cream[100];
    ctx.fillRect(bx, by, 10 * PX_PER_CM, 5);
    ctx.fillRect(bx, by - 8, 4, 18);
    ctx.fillRect(bx + 10 * PX_PER_CM - 4, by - 8, 4, 18);
    ctx.font = '500 26px "Geist Mono", ui-monospace, monospace';
    ctx.textBaseline = "bottom";
    ctx.fillText("10 cm", bx + 10 * PX_PER_CM + 14, by + 14);
    texture.needsUpdate = true;
  };
  draw();
  void document.fonts?.load('500 26px "Geist Mono"').then(draw);
  return texture;
}

export function Arena3D() {
  const tier = useQuality((s) => s.level);
  const texture = useMemo(() => matTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const { width, depth, cx, cz } = matFrame();
  return (
    <group position={[cx, 0, cz]}>
      <RoundedBox args={[width + 0.1, MAT_TOP - 0.002, depth + 0.1]} radius={0.025} smoothness={3} position={[0, (MAT_TOP - 0.002) / 2, 0]} material={kitMaterial("plastic", tier)} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, MAT_TOP, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial map={texture} roughness={0.62} />
      </mesh>
    </group>
  );
}
