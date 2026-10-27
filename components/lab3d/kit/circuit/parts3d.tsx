"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CatmullRomCurve3, CylinderGeometry, TubeGeometry, Vector3, type Group } from "three";
import type { PropValue } from "@/engine/types";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { kitMaterial } from "../materials";
import { BOARD_TOP } from "./space";

/*
 * Circuit parts in 3D (DESIGN.md §7.5 kit), each modelled along +X around the
 * slot centre, with its two terminals at x = ±half on the board.
 */

const CELL = new CylinderGeometry(0.058, 0.058, 0.2, 24).rotateZ(Math.PI / 2);
const CAP = new CylinderGeometry(0.03, 0.03, 0.03, 16).rotateZ(Math.PI / 2);
const BAND = new CylinderGeometry(0.049, 0.049, 0.018, 20).rotateZ(Math.PI / 2);
const BODY = new CylinderGeometry(0.044, 0.044, 0.22, 20).rotateZ(Math.PI / 2);

/** A lead: thin metal wire from a terminal (x0 on the board) up and into the part at (x1, y1). */
export function Lead({ x0, x1, y1, lift = 0.07 }: { x0: number; x1: number; y1: number; lift?: number }) {
  const tier = useQuality((s) => s.level);
  const geometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3([new Vector3(x0, BOARD_TOP, 0), new Vector3(x0, BOARD_TOP + lift, 0), new Vector3(x1, y1, 0)], false, "catmullrom", 0.1), 16, 0.008, 6, false), [x0, x1, y1, lift]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={kitMaterial("metal", tier)} />;
}

export function Battery3D({ half, volts }: { half: number; volts: number }) {
  const tier = useQuality((s) => s.level);
  const cells = Math.max(1, Math.min(4, Math.round(volts / 1.5)));
  const span = Math.min(half * 1.6, cells * 0.12 + 0.08);
  return (
    <group>
      <RoundedBox args={[span + 0.08, 0.1, 0.2]} radius={0.035} position={[0, BOARD_TOP + 0.05, 0]} material={kitMaterial("ink", tier)} />
      {Array.from({ length: cells }, (_, i) => {
        const x = -span / 2 + (span / cells) * (i + 0.5);
        return (
          <group key={i} position={[x, BOARD_TOP + 0.12, 0]} scale={[span / cells / 0.24, 1, 1]}>
            <mesh geometry={CELL} material={kitMaterial("orange", tier)} />
            <mesh geometry={CAP} position={[-0.11, 0, 0]} material={kitMaterial("metal", tier)} />
          </group>
        );
      })}
      <Lead x0={-half} x1={-span / 2 - 0.02} y1={BOARD_TOP + 0.08} />
      <Lead x0={half} x1={span / 2 + 0.02} y1={BOARD_TOP + 0.08} />
    </group>
  );
}

/** Colour code for a resistance: two digits, a multiplier and a gold tolerance band. */
const CODE = ["#1d1b1a", "#7a4a26", "#e0402d", "#ff8a1f", "#f4cc16", "#22a34f", "#3d63ff", "#7a52ff", "#8a8f99", "#ffffff"];
export function bandColours(ohms: number): string[] {
  const exp = Math.max(0, Math.floor(Math.log10(Math.max(10, ohms))) - 1);
  const digits = Math.round(ohms / 10 ** exp);
  return [CODE[Math.floor(digits / 10) % 10], CODE[digits % 10], CODE[Math.min(9, exp)], "#c9a227"];
}

export function Resistor3D({ half, ohms }: { half: number; ohms: number }) {
  const tier = useQuality((s) => s.level);
  const y = BOARD_TOP + 0.09;
  return (
    <group>
      <mesh geometry={BODY} position={[0, y, 0]} material={kitMaterial("clay", tier, P.cream[200])} />
      {bandColours(ohms).map((c, i) => (
        <mesh key={i} geometry={BAND} position={[-0.07 + i * 0.045 + (i === 3 ? 0.012 : 0), y, 0]} material={kitMaterial("clay", tier, c)} />
      ))}
      <Lead x0={-half} x1={-0.11} y1={y} />
      <Lead x0={half} x1={0.11} y1={y} />
    </group>
  );
}

/** A plain wire placed in a slot: an orange jumper. */
export function Jumper3D({ half }: { half: number }) {
  const tier = useQuality((s) => s.level);
  const geometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3([new Vector3(-half, BOARD_TOP + 0.02, 0), new Vector3(0, BOARD_TOP + 0.11, 0), new Vector3(half, BOARD_TOP + 0.02, 0)]), 24, 0.022, 10, false), [half]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={kitMaterial("orange", tier)} />;
}

export function Switch3D({ half, props }: { half: number; props: Record<string, PropValue> }) {
  const tier = useQuality((s) => s.level);
  const lever = useRef<Group>(null);
  const closed = props.closed !== false;
  useFrame((_, dt) => {
    // The lever swings to its new position on a quick ease.
    if (lever.current) lever.current.rotation.z += ((closed ? 0 : 0.6) - lever.current.rotation.z) * Math.min(1, dt * 14);
  });
  return (
    <group>
      <RoundedBox args={[0.34, 0.07, 0.16]} radius={0.025} position={[0, BOARD_TOP + 0.035, 0]} material={kitMaterial("plastic", tier)} />
      <mesh position={[-0.12, BOARD_TOP + 0.09, 0]} material={kitMaterial("metal", tier)}>
        <boxGeometry args={[0.04, 0.05, 0.08]} />
      </mesh>
      <mesh position={[0.12, BOARD_TOP + 0.09, 0]} material={kitMaterial("metal", tier)}>
        <boxGeometry args={[0.04, 0.05, 0.08]} />
      </mesh>
      <group ref={lever} position={[-0.12, BOARD_TOP + 0.115, 0]}>
        <mesh position={[0.13, 0, 0]} material={kitMaterial("orange", tier)}>
          <boxGeometry args={[0.27, 0.025, 0.05]} />
        </mesh>
      </group>
      <Lead x0={-half} x1={-0.14} y1={BOARD_TOP + 0.07} />
      <Lead x0={half} x1={0.14} y1={BOARD_TOP + 0.07} />
    </group>
  );
}
