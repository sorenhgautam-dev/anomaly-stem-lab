"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Color, CylinderGeometry, type Group, type Mesh } from "three";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { canvasTexture, decalMaterial, latheGeometry, MONO, shellGeometry } from "../../detail";
import { kitMaterial, liquidMaterial } from "../../materials";
import type { Getter } from "../glass";
import { RetortStand3D, type StandClamp } from "./stand";

/*
 * A burette on a retort stand (DESIGN.md §7.5 kit, §8.2): a long glass tube
 * with a beaded rim and printed graduations (0 mL at the top, as a real
 * burette reads), narrowing into a glass stopcock whose sand-gold paddle
 * turns open while it drips, then a fine glass tip. The group's origin is
 * the tip, so drops start there; the stand reaches down to the bench
 * (`bench` below the tip).
 */

const L = 0.4; // tube length
const R = 0.036;
const TOP = 0.1 + L + 0.012;
const SCALE_FROM = 0.16;
const SCALE_TO = 0.49;
const TUBE = shellGeometry([[0, 0.104], [0.009, 0.104], [0.011, 0.112], [0.03, 0.13], [R, 0.15], [R, 0.1 + L], [R + 0.003, TOP]], 0.0035, 0.11, 40);
const TIP = latheGeometry([[0.003, 0], [0.0055, 0.03], [0.009, 0.066], [0.012, 0.074], [0.012, 0.082]], 20);
const BARREL = new CylinderGeometry(0.017, 0.017, 0.07, 22).rotateX(Math.PI / 2).translate(0, 0.085, 0);
const KEY = new CylinderGeometry(0.012, 0.014, 0.096, 18).rotateX(Math.PI / 2).translate(0, 0.085, 0.004);
const FILL = new CylinderGeometry(R - 0.005, R - 0.005, 1, 22).translate(0, 0.5, 0);
const MARKS = new CylinderGeometry(R + 0.0012, R + 0.0012, SCALE_TO - SCALE_FROM, 20, 1, true, -0.62, 1.24).translate(0, (SCALE_FROM + SCALE_TO) / 2, 0);
/** A colourless solution reads as a faint sage column. */
const CLEAR = `#${new Color(P.white).lerp(new Color(LAB.chemistry.sage), 0.55).getHexString()}`;

/** 0 to 50 mL, a mark every mL, longer every 5, numbered every 10. */
function graduations() {
  return canvasTexture("burette-graduations", 96, 768, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = P.white;
    ctx.font = `600 22px ${MONO}`;
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 50; i++) {
      const y = 12 + (i / 50) * (h - 24);
      const major = i % 5 === 0;
      ctx.fillRect(8, y - 1.5, major ? 34 : 18, 3);
      if (i % 10 === 0) ctx.fillText(String(i), 48, y);
    }
  });
}

export function Burette3D({ level, open, bench, standX = -0.42, color = CLEAR, position }: { level: Getter<number>; open: Getter<number>; bench: number; standX?: number; color?: string; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const fill = useRef<Mesh>(null);
  const tap = useRef<Group>(null);
  const liquid = useMemo(() => liquidMaterial(color, tier, 0.62), [color, tier]);
  const rod = useMemo<[number, number]>(() => [standX, -0.03], [standX]);
  const clamps = useMemo<StandClamp[]>(() => [{ y: 0.1 + L * 0.62, to: [0, 0], grip: R }], []);

  useFrame(() => {
    const k = Math.max(0.001, Math.min(1, level()));
    fill.current?.scale.set(1, k * (L - 0.06), 1);
    if (tap.current) tap.current.rotation.z = Math.max(0, Math.min(1, open())) * (Math.PI / 2);
  });

  return (
    <group position={position}>
      <mesh geometry={TIP} material={kitMaterial("glass", tier)} renderOrder={2} />
      <mesh geometry={BARREL} material={kitMaterial("glass", tier)} renderOrder={2} />
      <mesh geometry={KEY} material={kitMaterial("plastic", tier)} />
      {/* The stopcock's paddle: across the flow when shut, along it when open. */}
      <group ref={tap} position={[0, 0.085, 0.056]}>
        <RoundedBox args={[0.11, 0.024, 0.012]} radius={0.005} smoothness={2} material={kitMaterial("sand", tier)} />
      </group>
      <mesh geometry={TUBE} material={kitMaterial("glass", tier)} renderOrder={2} />
      <mesh ref={fill} geometry={FILL} position={[0, 0.15, 0]} material={liquid} />
      <mesh geometry={MARKS} material={decalMaterial("burette-graduations", graduations(), 0.92)} renderOrder={3} />
      <RetortStand3D rod={rod} floor={-bench} top={TOP + 0.1} clamps={clamps} />
    </group>
  );
}
