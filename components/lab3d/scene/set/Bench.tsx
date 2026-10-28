"use client";

import { RoundedBox } from "@react-three/drei";
import { CapsuleGeometry, type BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { LabId } from "@/engine/types";
import { useQuality } from "@/lib/quality";
import { mergeParts } from "../../kit/detail";
import { kitMaterial } from "../../kit/materials";
import { BENCH } from "./bench-size";
import { LOOK } from "./look";

/*
 * The lab bench (DESIGN.md §8, §8.2): a thick worktop with a band under its
 * edge, on a cabinet with four bevelled doors and bar handles, standing on a
 * recessed kick. Chemistry's is beige on sage with sand-gold handles;
 * Robotics' is a white top with black trim and casework and gold handles.
 * The worktop's top face is y = 0; the status lights sit on the panel at the
 * right of the doors (StudioLife).
 */

const DOORS = 4;

let shapes: { doors: BufferGeometry; handles: BufferGeometry } | null = null;
function benchShapes() {
  if (shapes) return shapes;
  const { doorsFrom, doorsTo, doorTop, doorBottom, front } = BENCH;
  const gap = 0.03;
  const w = (doorsTo - doorsFrom - gap * (DOORS - 1)) / DOORS;
  const h = doorTop - doorBottom;
  const doors: BufferGeometry[] = [];
  const handles: BufferGeometry[] = [];
  for (let i = 0; i < DOORS; i++) {
    const x = doorsFrom + w / 2 + i * (w + gap);
    doors.push(new RoundedBoxGeometry(w, h, 0.04, 3, 0.014).translate(x, (doorTop + doorBottom) / 2, front + 0.02));
    // A bar handle on two stand-offs, near the top edge, toward the door's opening side.
    const hx = x + (i % 2 ? -1 : 1) * (w / 2 - 0.26);
    handles.push(new CapsuleGeometry(0.014, 0.3, 4, 12).rotateZ(Math.PI / 2).translate(hx, doorTop - 0.1, front + 0.085));
    for (const dx of [-0.13, 0.13]) handles.push(new CapsuleGeometry(0.009, 0.04, 3, 8).rotateX(Math.PI / 2).translate(hx + dx, doorTop - 0.1, front + 0.06));
  }
  shapes = { doors: mergeParts(doors), handles: mergeParts(handles) };
  return shapes;
}

export function Bench({ lab }: { lab: LabId }) {
  const tier = useQuality((s) => s.level);
  const look = LOOK[lab];
  const finish = lab === "chemistry" ? "satin" : "matte";
  const g = benchShapes();
  const { top, band, carcass, kick } = BENCH;
  return (
    <group>
      <RoundedBox args={top.size} radius={0.1} smoothness={5} position={top.at} material={kitMaterial(finish, tier, look.bench)} />
      <RoundedBox args={band.size} radius={0.04} smoothness={3} position={band.at} material={kitMaterial(finish, tier, look.band)} />
      <RoundedBox args={carcass.size} radius={0.05} smoothness={3} position={carcass.at} material={kitMaterial(finish, tier, look.cabinet)} />
      <mesh geometry={g.doors} material={kitMaterial(finish, tier, look.cabinet)} />
      <mesh geometry={g.handles} material={kitMaterial(lab === "chemistry" ? "sand" : "gold", tier)} />
      <RoundedBox args={kick.size} radius={0.03} smoothness={2} position={kick.at} material={kitMaterial("matte", tier, look.kick)} />
    </group>
  );
}
