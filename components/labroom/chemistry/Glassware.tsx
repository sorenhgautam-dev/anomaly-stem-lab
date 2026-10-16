"use client";

import { useEffect, useMemo, useRef } from "react";
import { Color, MeshBasicMaterial, Object3D, type InstancedMesh } from "three";
import { RAMP } from "@/lib/tokens";
import { roomGeos, VESSELS, type Vessel } from "../geometry";
import { roomMats } from "../materials";

/*
 * Glassware silhouettes (instanced: one draw for each vessel's glass and one
 * for its liquid). Liquids glow faintly in the lab's blues and aqua; gold
 * and coral stay reserved for verdicts (CLAUDE.md §3.3).
 */

export interface Piece {
  vessel: Vessel;
  at: [number, number, number];
  scale?: number;
  /** Index into the liquid colours. */
  tint: number;
}

const TINTS = [RAMP.ion[400], RAMP.glow[400], RAMP.ion[200], RAMP.glow[200]].map((c) => new Color(c).multiplyScalar(1.35));

export function Glassware({ pieces }: { pieces: Piece[] }) {
  const liquid = useMemo(() => new MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.85 }), []);
  useEffect(() => () => liquid.dispose(), [liquid]);
  return (
    <group>
      {VESSELS.map((vessel) => {
        const list = pieces.filter((p) => p.vessel === vessel);
        return list.length > 0 ? <VesselSet key={vessel} vessel={vessel} pieces={list} liquid={liquid} /> : null;
      })}
    </group>
  );
}

function VesselSet({ vessel, pieces, liquid }: { vessel: Vessel; pieces: Piece[]; liquid: MeshBasicMaterial }) {
  const glass = useRef<InstancedMesh>(null);
  const fill = useRef<InstancedMesh>(null);
  const geo = roomGeos().vessels[vessel];

  useEffect(() => {
    const o = new Object3D();
    pieces.forEach((p, i) => {
      o.position.set(...p.at);
      o.rotation.set(0, i * 1.7, 0);
      o.scale.setScalar(p.scale ?? 1);
      o.updateMatrix();
      glass.current?.setMatrixAt(i, o.matrix);
      fill.current?.setMatrixAt(i, o.matrix);
      fill.current?.setColorAt(i, TINTS[p.tint % TINTS.length]);
    });
    for (const m of [glass.current, fill.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [pieces]);

  return (
    <>
      <instancedMesh ref={fill} args={[geo.liquid, liquid, pieces.length]} />
      <instancedMesh ref={glass} args={[geo.glass, roomMats().glass, pieces.length]} renderOrder={1} />
    </>
  );
}
