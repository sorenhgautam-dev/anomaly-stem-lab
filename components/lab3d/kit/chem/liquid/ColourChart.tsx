"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Color, ConeGeometry, type InstancedMesh, type Mesh, Object3D } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { kitMaterial, ownMaterial } from "../../materials";
import type { Getter } from "../glass";
import { Readout } from "../instruments";

/*
 * An indicator colour chart standing on the bench (DESIGN.md §8.1
 * "visualization tools"): a white card with rows of colour chips (bottom to
 * top) and a few printed labels, so a colour can be read as acid, neutral or
 * base without relying on colour alone. A solid sand-gold pointer glides
 * to the reading; after a wrong run a translucent teal pointer (the lab's
 * ghost colour) marks the student's idea on the other side. Rows are positions 0..n-1; a reading can
 * fall between them (a pH of 6.4).
 */

export interface ChartRow {
  colours: string[];
  label?: string;
}

const POINTER = new ConeGeometry(0.035, 0.08, 16).rotateZ(Math.PI / 2);
const tmp = new Object3D();
const color = new Color();

export function ColourChart({ rows, rowHeight, chipWidth = 0.22, labelWidth = 0.3, at, ghostAt, side = 1, position }: { rows: ChartRow[]; rowHeight: number; chipWidth?: number; labelWidth?: number; at: Getter<number | null>; ghostAt: number | null; side?: 1 | -1; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const chips = useRef<InstancedMesh>(null);
  const pointer = useRef<Mesh>(null);
  const ghostMaterial = useMemo(() => ownMaterial(LAB.chemistry.wall, tier, { transparent: true, opacity: 0.5 }), [tier]);
  const count = rows.reduce((n, r) => n + r.colours.length, 0);
  const chip = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 2, 0.12), []);
  const width = chipWidth + labelWidth + 0.08;
  const height = rows.length * rowHeight + 0.08;
  const left = -width / 2 + 0.04;
  const y = (row: number) => 0.04 + (row + 0.5) * rowHeight - height / 2;
  // The pointer sits on one side, the ghost's on the other.
  const edge = (s: number) => s * (width / 2 + 0.06);

  useLayoutEffect(() => {
    const m = chips.current;
    if (!m) return;
    let i = 0;
    rows.forEach((r, row) => {
      const w = chipWidth / r.colours.length;
      r.colours.forEach((c, k) => {
        tmp.position.set(left + w * (k + 0.5), y(row), 0.025);
        tmp.scale.set(w - 0.012, rowHeight - 0.012, 0.02);
        tmp.updateMatrix();
        m.setMatrixAt(i, tmp.matrix);
        m.setColorAt(i, color.set(c));
        i++;
      });
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  useFrame((_, delta) => {
    const p = pointer.current;
    if (!p) return;
    const row = at();
    p.visible = row !== null;
    if (row === null) return;
    const target = y(Math.max(0, Math.min(rows.length - 1, row)));
    p.position.y += (target - p.position.y) * Math.min(1, delta * 8);
  });

  return (
    <group position={position}>
      <RoundedBox args={[width, height, 0.03]} radius={0.015} smoothness={3} material={kitMaterial("plastic", tier)} />
      <instancedMesh ref={chips} args={[chip, kitMaterial("clay", tier, P.white), count]} />
      {rows.map((r, row) => (r.label ? <Readout key={row} text={() => r.label ?? ""} height={0.075} position={[left + chipWidth + labelWidth / 2 + 0.02, y(row), 0.04]} /> : null))}
      <mesh ref={pointer} geometry={POINTER} position={[edge(side), y(0), 0.03]} rotation={[0, side > 0 ? 0 : Math.PI, 0]} material={kitMaterial("sand", tier)} />
      {ghostAt !== null && <mesh geometry={POINTER} position={[edge(-side), y(Math.max(0, Math.min(rows.length - 1, ghostAt))), 0.03]} rotation={[0, -side > 0 ? 0 : Math.PI, 0]} material={ghostMaterial} />}
    </group>
  );
}
