"use client";

import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { CanvasTexture, MeshPhysicalMaterial, RepeatWrapping, SRGBColorSpace } from "three";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { kitMaterial } from "../materials";
import { BOARD_SCALE, BOARD_TOP } from "./space";

/*
 * The circuit board (DESIGN.md §7.5 kit "breadboard grid", §8 Robotics):
 * a white face with a printed dot grid on a black carrier, so it reads as
 * its own object on Robotics' white bench. Sized to fit the circuit on it;
 * its top face is BOARD_TOP.
 */

function dotGrid() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  // A clean white board, so it reads white under either lab's light (cream-50 went grey under the cool room).
  ctx.fillStyle = P.white;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "rgba(22,23,26,0.28)";
  ctx.beginPath();
  ctx.arc(32, 32, 3, 0, Math.PI * 2);
  ctx.fill();
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function Board3D({ minX, maxX, minY, maxY }: { minX: number; maxX: number; minY: number; maxY: number }) {
  const tier = useQuality((s) => s.level);
  const w = (maxX - minX) * BOARD_SCALE;
  const d = (maxY - minY) * BOARD_SCALE;
  const material = useMemo(() => {
    const map = dotGrid();
    map.repeat.set(w / 0.11, d / 0.11);
    return new MeshPhysicalMaterial({ map, roughness: 0.55, clearcoat: tier === "low" ? 0 : 0.4 });
  }, [w, d, tier]);
  const cx = ((minX + maxX) / 2 - 500) * BOARD_SCALE;
  const cz = ((minY + maxY) / 2 - 300) * BOARD_SCALE;
  return (
    <group position={[cx, 0, cz]}>
      <RoundedBox args={[w + 0.07, BOARD_TOP - 0.008, d + 0.07]} radius={0.024} smoothness={3} position={[0, (BOARD_TOP - 0.008) / 2, 0]} material={kitMaterial("matte", tier, LAB.robotics.trim)} />
      <RoundedBox args={[w, 0.034, d]} radius={0.014} smoothness={3} position={[0, BOARD_TOP - 0.017, 0]} material={material} />
    </group>
  );
}
