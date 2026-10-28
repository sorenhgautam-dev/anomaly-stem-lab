"use client";

import { useEffect, useMemo } from "react";
import { CylinderGeometry, TorusGeometry, type BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { mergeParts } from "../../detail";
import { kitMaterial } from "../../materials";

/*
 * A retort stand (DESIGN.md §8.2): a heavy bevelled sage base, a steel rod,
 * and for each thing it holds a boss head on the rod, an arm and a ring
 * clamp round the glass, with sand-gold thumbscrews. Everything is in the
 * parent's space, and merged by material: three draw calls for the stand.
 * `parts` draws only the fixed stand (base and rod) or only the clamps, for
 * a clamp that slides along the rod with what it holds.
 */

export interface StandClamp {
  /** The arm's height. */
  y: number;
  /** Where the held thing's axis is (x, z). */
  to: [number, number];
  /** The held thing's radius at the clamp. */
  grip: number;
}

type Parts = "all" | "stand" | "clamps";

function standShapes(rod: [number, number], floor: number, top: number, clamps: StandClamp[], parts: Parts) {
  const [x, z] = rod;
  const steel: BufferGeometry[] = parts === "clamps" ? [] : [new CylinderGeometry(0.014, 0.014, top - floor, 14).translate(x, (top + floor) / 2, z), new CylinderGeometry(0.02, 0.02, 0.008, 14).translate(x, top, z)];
  const gold: BufferGeometry[] = [];
  // The base runs toward what the stand holds, so it sits under the load.
  const dx = clamps.reduce((s, c) => s + c.to[0] - x, 0);
  const dz = clamps.reduce((s, c) => s + c.to[1] - z, 0);
  const along = Math.abs(dx) >= Math.abs(dz);
  const n = Math.hypot(dx, dz) || 1;
  const base = parts === "clamps" ? null : new RoundedBoxGeometry(along ? 0.4 : 0.24, 0.036, along ? 0.24 : 0.4, 3, 0.012).translate(x + (dx / n) * 0.1, floor + 0.018, z + (dz / n) * 0.1);
  for (const c of parts === "stand" ? [] : clamps) {
    const a = Math.atan2(c.to[1] - z, c.to[0] - x);
    const reach = Math.hypot(c.to[0] - x, c.to[1] - z) - c.grip - 0.016;
    const place = (g: BufferGeometry, px: number, py: number, pz: number) => g.translate(px, py, pz).rotateY(-a).translate(x, c.y, z);
    // The boss head on the rod, its thumbscrew, and the arm out to the clamp.
    steel.push(place(new RoundedBoxGeometry(0.05, 0.05, 0.05, 2, 0.012), 0, 0, 0));
    gold.push(place(new CylinderGeometry(0.013, 0.013, 0.03, 14).rotateX(Math.PI / 2), 0, 0, 0.038));
    steel.push(place(new CylinderGeometry(0.008, 0.008, reach, 10).rotateZ(Math.PI / 2), reach / 2 + 0.02, 0, 0));
    // The ring clamp, open on the far side, with a thumbscrew where the arm meets it.
    const ring = new TorusGeometry(c.grip + 0.012, 0.0075, 8, 36, Math.PI * 1.7).rotateZ(Math.PI * 0.15).rotateX(Math.PI / 2);
    steel.push(place(ring, reach + c.grip + 0.016, 0, 0));
    gold.push(place(new CylinderGeometry(0.009, 0.009, 0.026, 12).rotateZ(Math.PI / 2), reach + 0.006, 0, 0));
  }
  return { steel: mergeParts(steel), gold: gold.length ? mergeParts(gold) : null, base };
}

export function RetortStand3D({ rod, floor, top, clamps, parts = "all" }: { rod: [number, number]; floor: number; top: number; clamps: StandClamp[]; parts?: Parts }) {
  const tier = useQuality((s) => s.level);
  // Pass module constants (as the stages do): the stand is rebuilt whenever an array is new.
  const g = useMemo(() => standShapes(rod, floor, top, clamps, parts), [rod, floor, top, clamps, parts]);
  useEffect(
    () => () => {
      g.steel.dispose();
      g.gold?.dispose();
      g.base?.dispose();
    },
    [g],
  );
  return (
    <group>
      {g.base && <mesh geometry={g.base} material={kitMaterial("satin", tier, LAB.chemistry.sage)} />}
      <mesh geometry={g.steel} material={kitMaterial("steel", tier)} />
      {g.gold && <mesh geometry={g.gold} material={kitMaterial("sand", tier)} />}
    </group>
  );
}
