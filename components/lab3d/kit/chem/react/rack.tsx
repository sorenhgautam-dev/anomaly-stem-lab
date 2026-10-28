"use client";

import { CylinderGeometry, ExtrudeGeometry, Path, Shape, type BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { mergeParts } from "../../detail";
import { kitMaterial } from "../../materials";

/*
 * A test-tube rack (DESIGN.md §8.2): a solid sage base the tubes stand on,
 * and a bevelled top plate bored with three holes on four posts. One merged
 * mesh. The middle hole is at the origin; the base's top is y = 0.05.
 */

const W = 0.6;
const D = 0.22;
const PLATE_Y = 0.21;
const HOLE = 0.079;
const PITCH = 0.19;

function topPlate(): BufferGeometry {
  const r = 0.018;
  const s = new Shape();
  s.moveTo(-W / 2 + r, -D / 2);
  s.lineTo(W / 2 - r, -D / 2);
  s.quadraticCurveTo(W / 2, -D / 2, W / 2, -D / 2 + r);
  s.lineTo(W / 2, D / 2 - r);
  s.quadraticCurveTo(W / 2, D / 2, W / 2 - r, D / 2);
  s.lineTo(-W / 2 + r, D / 2);
  s.quadraticCurveTo(-W / 2, D / 2, -W / 2, D / 2 - r);
  s.lineTo(-W / 2, -D / 2 + r);
  s.quadraticCurveTo(-W / 2, -D / 2, -W / 2 + r, -D / 2);
  for (const x of [-PITCH, 0, PITCH]) s.holes.push(new Path().absarc(x, 0, HOLE, 0, Math.PI * 2, true));
  // Extruded up from the plate's underside, with a small bevel all round.
  return new ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 28 }).rotateX(-Math.PI / 2).translate(0, PLATE_Y, 0);
}

let shape: BufferGeometry | null = null;
function rack() {
  shape ??= mergeParts([
    new RoundedBoxGeometry(W, 0.05, D, 3, 0.012).translate(0, 0.025, 0),
    topPlate(),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => new CylinderGeometry(0.009, 0.009, PLATE_Y - 0.05, 10).translate(sx * (W / 2 - 0.024), 0.05 + (PLATE_Y - 0.05) / 2, sz * (D / 2 - 0.024)))),
  ]);
  return shape;
}

export function TubeRack3D({ position }: { position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  return <mesh geometry={rack()} position={position} material={kitMaterial("satin", tier, LAB.chemistry.sage)} />;
}
