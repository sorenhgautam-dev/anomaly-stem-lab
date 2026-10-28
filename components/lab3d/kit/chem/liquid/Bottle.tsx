"use client";

import { CylinderGeometry, TorusGeometry } from "three";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { canvasTexture, corner, decalMaterial, latheGeometry, SANS, shellGeometry } from "../../detail";
import { kitMaterial, liquidMaterial } from "../../materials";

/*
 * A dropper bottle of indicator (DESIGN.md §8.2): a glass bottle with real
 * wall thickness, a rounded shoulder and a short neck, a printed paper
 * label, a sand-gold collar the dropper rests in, and the indicator inside
 * (its colour is data). Stands on the bench at its origin; the neck's top
 * is at NECK_TOP.
 */

export const NECK_TOP = 0.256;
const GLASS = shellGeometry([[0, 0], [0.08, 0], ...corner(0.08, 0.01, 0.01, -Math.PI / 2, 0, 4).slice(1), [0.09, 0.16], [0.084, 0.184], [0.066, 0.204], [0.042, 0.216], [0.034, 0.224], [0.034, 0.25], [0.037, NECK_TOP]], 0.005, 0.01, 48);
const LIQUID = latheGeometry([[0.001, 0.011], [0.077, 0.011], [0.0845, 0.02], [0.0845, 0.12], [0.001, 0.12]], 40);
const COLLAR = new TorusGeometry(0.037, 0.008, 10, 32).rotateX(Math.PI / 2).translate(0, NECK_TOP - 0.004, 0);
const LABEL = new CylinderGeometry(0.0915, 0.0915, 0.08, 32, 1, true, -0.85, 1.7).translate(0, 0.085, 0);

function label() {
  return canvasTexture("indicator-bottle-label", 256, 128, (ctx, w, h) => {
    ctx.fillStyle = P.white;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = P.ink[300];
    ctx.fillRect(0, 10, w, 3);
    ctx.fillRect(0, h - 13, w, 3);
    ctx.fillStyle = P.ink[900];
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 34px ${SANS}`;
    ctx.fillText("Indicator", w / 2, h / 2 - 12);
    ctx.font = `500 22px ${SANS}`;
    ctx.fillStyle = P.ink[500];
    ctx.fillText("red cabbage", w / 2, h / 2 + 22);
  });
}

export function IndicatorBottle3D({ color, position }: { color: string; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  return (
    <group position={position}>
      <mesh geometry={LIQUID} material={liquidMaterial(color, tier, 0.86)} />
      <mesh geometry={GLASS} material={kitMaterial("glass", tier)} renderOrder={2} />
      <mesh geometry={LABEL} material={decalMaterial("indicator-bottle-label", label())} renderOrder={3} />
      <mesh geometry={COLLAR} material={kitMaterial("matte", tier, LAB.chemistry.gold)} />
    </group>
  );
}
