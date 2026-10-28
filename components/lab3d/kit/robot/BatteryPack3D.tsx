"use client";

import { useEffect, useMemo } from "react";
import { MeshPhysicalMaterial, MeshStandardMaterial, type BufferGeometry, type Material } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality, type Quality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { canvasTexture, latheGeometry, mergeParts, MONO, SANS } from "../detail";
import { kitMaterial } from "../materials";

/*
 * A battery holder for the robot kit (DESIGN.md §7.5 "battery", §8.2): a
 * matte black holder with a wall between each cell, AA cells in printed
 * white sleeves with a gold + band (like the circuit kit's), alternating
 * ways round, steel end caps, and gold contact plates at each end. Holder,
 * sleeves, caps and contacts are one merged mesh each.
 */

const PITCH = 0.1;
const R = 0.045;
const L = 0.32;
const CELL_Y = 0.082;

const sleeves = new Map<Quality, Material>();
/** The cell's printed sleeve: white with a gold band at the + end, "1.5 V AA" along its length. */
function sleeveMaterial(tier: Quality): Material {
  let m = sleeves.get(tier);
  if (m) return m;
  const map = canvasTexture("aa-sleeve-pack", 128, 512, (ctx, w, h) => {
    ctx.fillStyle = LAB.robotics.bench;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = LAB.robotics.gold;
    ctx.fillRect(0, 0, w, h * 0.3);
    ctx.fillStyle = LAB.robotics.trim;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const [text, font, at] of [
      ["1.5 V   AA", `800 30px ${SANS}`, 0.64],
      ["+", `800 40px ${MONO}`, 0.15],
    ] as const) {
      ctx.save();
      ctx.translate(w * 0.5, h * at);
      ctx.rotate(Math.PI / 2);
      ctx.font = font;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  });
  const o = { map, roughness: 0.3, color: "#ffffff" };
  m = tier === "low" ? new MeshStandardMaterial(o) : new MeshPhysicalMaterial({ ...o, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  sleeves.set(tier, m);
  return m;
}

function packShapes(cells: number): Record<"holder" | "sleeves" | "caps" | "contacts", BufferGeometry> {
  const depth = cells * PITCH + 0.04;
  const z = (i: number) => -depth / 2 + 0.07 + i * PITCH;
  const w = L + 0.06;
  const holder = [new RoundedBoxGeometry(w, 0.03, depth, 2, 0.01).translate(0, 0.015, 0)];
  for (const x of [-w / 2 + 0.007, w / 2 - 0.007]) holder.push(new RoundedBoxGeometry(0.014, 0.1, depth, 2, 0.006).translate(x, 0.05, 0));
  for (let i = 0; i <= cells; i++) holder.push(new RoundedBoxGeometry(w - 0.02, 0.07, 0.008, 2, 0.003).translate(0, 0.035, -depth / 2 + 0.02 + i * PITCH));
  const cell: BufferGeometry[] = [];
  const caps: BufferGeometry[] = [];
  const contacts: BufferGeometry[] = [];
  for (let i = 0; i < cells; i++) {
    // Lathed along Y and laid along +X (+ end at +X); every other cell turned round.
    const lay = (g: BufferGeometry) => g.translate(0, -L / 2, 0).rotateZ(-Math.PI / 2).rotateY(i % 2 ? Math.PI : 0).translate(0, CELL_Y, z(i));
    cell.push(lay(latheGeometry([[R * 0.86, 0.004], [R, 0.012], [R, L - 0.012], [R * 0.86, L - 0.004]], 28)));
    caps.push(lay(latheGeometry([[0.001, 0], [R * 0.86, 0], [R * 0.86, 0.006]], 20)), lay(latheGeometry([[R * 0.86, L - 0.006], [R * 0.86, L], [R * 0.38, L], [R * 0.36, L + 0.012], [0.001, L + 0.013]], 20)));
    for (const x of [-w / 2 + 0.016, w / 2 - 0.016]) contacts.push(new RoundedBoxGeometry(0.004, 0.05, 0.05, 1, 0.0015).translate(x, CELL_Y, z(i)));
  }
  return { holder: mergeParts(holder), sleeves: mergeParts(cell), caps: mergeParts(caps), contacts: mergeParts(contacts) };
}

export function BatteryPack3D({ cells = 4, position, rotation }: { cells?: number; position?: [number, number, number]; rotation?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const g = useMemo(() => packShapes(cells), [cells]);
  useEffect(() => () => Object.values(g).forEach((x) => x.dispose()), [g]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={g.holder} material={kitMaterial("black", tier)} />
      <mesh geometry={g.sleeves} material={sleeveMaterial(tier)} />
      <mesh geometry={g.caps} material={kitMaterial("steel", tier)} />
      <mesh geometry={g.contacts} material={kitMaterial("gold", tier)} />
    </group>
  );
}
