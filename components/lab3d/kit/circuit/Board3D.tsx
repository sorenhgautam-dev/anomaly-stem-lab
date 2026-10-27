"use client";

import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { CanvasTexture, MeshPhysicalMaterial, RepeatWrapping, SRGBColorSpace } from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { BOARD_SCALE, BOARD_TOP } from "./space";

/*
 * The circuit board (DESIGN.md §7.5 kit "breadboard grid"): a soft cream
 * slab with a printed dot grid, sized to fit the circuit on it.
 */

function dotGrid() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = P.cream[50];
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "rgba(110,102,93,0.35)";
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
  return <RoundedBox args={[w, BOARD_TOP, d]} radius={0.04} smoothness={3} position={[cx, BOARD_TOP / 2, cz]} material={material} />;
}
