"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CylinderGeometry, TorusGeometry, type Group, type Mesh } from "three";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { canvasTexture, corner, decalMaterial, latheGeometry, mergeParts, MONO, shellGeometry } from "../../detail";
import { kitMaterial, liquidMaterial } from "../../materials";
import { Readout } from "../instruments";
import type { Getter } from "../glass";

/*
 * A gas syringe in a cradle (DESIGN.md §7.5 kit, §8.2): a glass barrel with
 * real wall thickness lying along x, its tapered nozzle at the origin and a
 * finger flange at the open end, printed graduations every 10 mL, and a
 * plunger (rubber seal, white rod, sand-gold thumb press) that slides out
 * as gas arrives. The cradle is a sage base with two steel posts and ring
 * clamps. `ml` is a getter read every frame.
 */

const L = 0.62;
const R = 0.075;
/** Lathed along y, then laid along +x (y becomes x). */
const alongX = <T extends { rotateZ: (a: number) => T }>(g: T) => g.rotateZ(-Math.PI / 2);
const GLASS = alongX(
  mergeParts([
    shellGeometry([[0, 0], [R - 0.008, 0], ...corner(R - 0.008, 0.008, 0.008, -Math.PI / 2, 0, 4).slice(1), [R, L], [R + 0.006, L + 0.006]], 0.005, 0.012, 48),
    latheGeometry([[0.008, -0.075], [0.0105, -0.03], [0.022, -0.006], [0.034, 0.002]], 24),
    new CylinderGeometry(R + 0.034, R + 0.034, 0.012, 40).translate(0, L - 0.004, 0),
  ]),
);
const MARKS = alongX(new CylinderGeometry(R + 0.0012, R + 0.0012, L - 0.06, 32, 1, true, -0.75, 1.5).translate(0, L / 2, 0));
const ROD = alongX(new CylinderGeometry(0.012, 0.012, L, 12).translate(0, L / 2, 0));
const SEAL = alongX(latheGeometry([[0.0005, -0.016], [R * 0.9, -0.016], [R * 0.93, -0.008], [R * 0.93, 0.008], [R * 0.9, 0.016], [0.0005, 0.016]], 32));
const PRESS = alongX(latheGeometry([[0.0005, -0.012], [R * 1.02, -0.012], [R * 1.08, -0.004], [R * 1.08, 0.006], [R * 1.02, 0.012], [0.0005, 0.012]], 36)).translate(L + 0.03, 0, 0);
const GAS = new CylinderGeometry(R * 0.9, R * 0.9, 1, 24).rotateZ(Math.PI / 2).translate(0.5, 0, 0);
const POSTS = [0.12, L - 0.1];

/** 0 to 250 mL along the barrel: a mark every 10, longer every 50 with its number. */
function graduations() {
  return canvasTexture("syringe-graduations", 160, 1024, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = P.white;
    for (let ml = 0; ml <= 250; ml += 10) {
      const y = h - 6 - (ml / 250) * (h - 12);
      const major = ml % 50 === 0;
      ctx.fillRect(6, y - 2, major ? 46 : 26, 4);
      if (major && ml > 0) {
        // Rotated to read along the barrel.
        ctx.save();
        ctx.translate(76, y);
        ctx.rotate(-Math.PI / 2);
        ctx.font = `600 34px ${MONO}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(ml), 0, 0);
        ctx.restore();
      }
    }
  });
}

export function GasSyringe3D({ ml, max = 250, position }: { ml: Getter<number>; max?: number; position: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const plunger = useRef<Group>(null);
  const gas = useRef<Mesh>(null);
  const drop = position[1];
  // The cradle's posts and ring clamps, from the bench up to the barrel: one steel mesh.
  const cradle = useMemo(
    () =>
      mergeParts(
        POSTS.flatMap((x) => [
          new CylinderGeometry(0.012, 0.012, drop - 0.04 - R, 12).translate(x, (-drop + 0.04 - R) / 2, 0),
          new TorusGeometry(R + 0.012, 0.009, 10, 36).rotateY(Math.PI / 2).translate(x, 0, 0),
        ]),
      ),
    [drop],
  );
  useEffect(() => () => cradle.dispose(), [cradle]);
  useFrame(() => {
    const travel = Math.max(0, Math.min(1, ml() / max)) * (L - 0.06);
    plunger.current?.position.set(0.03 + travel, 0, 0);
    if (gas.current) {
      gas.current.scale.set(Math.max(0.001, 0.03 + travel), 1, 1);
      gas.current.visible = travel > 0.004;
    }
  });
  return (
    <group position={position}>
      <mesh ref={gas} geometry={GAS} material={liquidMaterial(LAB.chemistry.sage, tier, 0.3)} />
      <mesh geometry={GLASS} material={kitMaterial("glass", tier)} renderOrder={2} />
      <mesh geometry={MARKS} material={decalMaterial("syringe-graduations", graduations(), 0.9)} renderOrder={3} />
      <group ref={plunger}>
        <mesh geometry={SEAL} material={kitMaterial("rubber", tier)} />
        <mesh geometry={ROD} material={kitMaterial("plastic", tier)} />
        <mesh geometry={PRESS} material={kitMaterial("sand", tier)} />
      </group>
      <RoundedBox args={[L * 0.95, 0.036, 0.28]} radius={0.014} smoothness={3} position={[L / 2, -drop + 0.018, 0]} material={kitMaterial("satin", tier, LAB.chemistry.sage)} />
      <mesh geometry={cradle} material={kitMaterial("steel", tier)} />
      {/* Padded to a fixed width: the label's canvas must not change size once drawn. */}
      <Readout text={() => `O₂ ${String(Math.round(ml())).padStart(3, " ")} mL`} height={0.1} position={[L / 2, R + 0.14, 0]} />
    </group>
  );
}
