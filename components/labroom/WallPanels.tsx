"use client";

import { useEffect, useMemo, useRef } from "react";
import { InstancedBufferAttribute, Matrix4, PlaneGeometry, type InstancedMesh } from "three";
import { mulberry32 } from "@/components/landing/random";
import { usePulse } from "./pulses";
import { panelMaterial } from "./shaders/surfaces";

/*
 * A wall of softly lit panels (one instanced draw). Some panels are screens
 * running a slow holographic trace. The whole wall ripples gold from the
 * bench on a correct run and tears into coral glitch bands on an ANOMALY.
 */

export interface PanelWall {
  /** Bottom-left corner of the grid. */
  origin: [number, number, number];
  cols: number;
  rows: number;
  size: [number, number];
  gap: number;
  /** Cells to leave out ("col,row"), e.g. where a shelf hangs. */
  skip?: string[];
  /** Cells that are screens ("col,row"). */
  screens?: string[];
  edge: string;
  screen: string;
}

export function WallPanels({ wall }: { wall: PanelWall }) {
  const mesh = useRef<InstancedMesh>(null);
  const cells = useMemo(() => {
    const out: { col: number; row: number }[] = [];
    for (let row = 0; row < wall.rows; row++) for (let col = 0; col < wall.cols; col++) if (!wall.skip?.includes(`${col},${row}`)) out.push({ col, row });
    return out;
  }, [wall]);
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(1, 1);
    const rand = mulberry32(3);
    g.setAttribute("aSeed", new InstancedBufferAttribute(Float32Array.from(cells, () => rand()), 1));
    g.setAttribute("aKind", new InstancedBufferAttribute(Float32Array.from(cells, (c) => (wall.screens?.includes(`${c.col},${c.row}`) ? 1 : 0)), 1));
    return g;
  }, [cells, wall.screens]);
  const material = useMemo(() => panelMaterial(wall.edge, wall.screen), [wall.edge, wall.screen]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  usePulse(material);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const matrix = new Matrix4();
    const [w, h] = wall.size;
    cells.forEach((c, i) => {
      matrix.makeScale(w, h, 1);
      matrix.setPosition(wall.origin[0] + c.col * (w + wall.gap) + w / 2, wall.origin[1] + c.row * (h + wall.gap) + h / 2, wall.origin[2]);
      m.setMatrixAt(i, matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [cells, wall]);

  return <instancedMesh ref={mesh} args={[geometry, material, cells.length]} frustumCulled={false} />;
}
