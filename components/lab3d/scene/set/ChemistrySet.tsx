"use client";

import { useMemo } from "react";
import { CylinderGeometry, MeshBasicMaterial, type BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { latheGeometry, mergeParts, type Profile } from "../../kit/detail";
import { kitMaterial, liquidMaterial } from "../../kit/materials";
import { BENCH } from "./bench-size";

/*
 * Chemistry's set (DESIGN.md §8 "fume-hood frame", "shelves with real
 * apparatus silhouettes"): the bench stands inside a beige fume-hood frame
 * with sage linings and a warm light strip under its header, and a sage
 * reagent shelf (one plank on two uprights) runs along the back of the worktop with lathed glassware
 * (reagent bottles, flasks, a measuring cylinder) at both ends. The middle
 * of the shelf is left empty, so nothing stands behind the apparatus.
 * Each material is one merged geometry: seven draw calls in all.
 */

const SHELF_Z = BENCH.back + 0.19;
const SHELF_Y = 0.6;
const HOOD_Z = BENCH.back + 0.42;

type Piece = { glass: Profile; liquid?: { profile: Profile; tint: "sage" | "sand" }; cap?: [radius: number, height: number] };

/** A reagent bottle: square-shouldered, a short neck and a screw cap. */
function bottle(r: number, h: number, fill: number, tint: "sage" | "sand"): Piece {
  const neck = r * 0.42;
  const body = h * 0.72;
  return {
    glass: [[0, 0], [r * 0.92, 0], [r, r * 0.12], [r, body], [r * 0.82, body + r * 0.42], [neck, body + r * 0.72], [neck, h]],
    liquid: { profile: [[0, 0.006], [r * 0.9, 0.006], [r * 0.9, body * fill]], tint },
    cap: [neck * 1.18, h * 0.12],
  };
}

/** A conical flask with a rolled rim. */
function flask(r: number, h: number, fill: number, tint: "sage" | "sand"): Piece {
  const neck = r * 0.36;
  const shoulder = h * 0.68;
  return {
    glass: [[0, 0], [r * 0.94, 0], [r, r * 0.1], [neck, shoulder], [neck, h], [neck * 1.18, h + 0.006]],
    liquid: { profile: [[0, 0.006], [r * 0.93, 0.006], [r - (r - neck) * fill * 0.9, shoulder * fill * 0.9]], tint },
  };
}

/** A tall measuring cylinder on a round foot. */
function cylinder(r: number, h: number, fill: number): Piece {
  return {
    glass: [[0, 0], [r * 2, 0], [r * 2, 0.014], [r, 0.016], [r, h], [r * 1.25, h + 0.008]],
    liquid: { profile: [[0, 0.02], [r * 0.9, 0.02], [r * 0.9, h * fill]], tint: "sage" },
  };
}

/** What stands where: [piece, x, on the shelf (or the worktop under it)]. */
const LAYOUT: [Piece, number, boolean][] = [
  [bottle(0.075, 0.3, 0.7, "sand"), -2.12, true],
  [bottle(0.06, 0.24, 0.5, "sage"), -1.9, true],
  [flask(0.1, 0.24, 0.45, "sage"), -1.62, true],
  [cylinder(0.032, 0.36, 0.6), -1.38, true],
  [bottle(0.085, 0.34, 0.6, "sage"), -2.05, false],
  [flask(0.12, 0.28, 0.35, "sand"), -1.7, false],
  [cylinder(0.03, 0.32, 0.4), 1.36, true],
  [bottle(0.07, 0.28, 0.65, "sage"), 1.6, true],
  [bottle(0.07, 0.28, 0.4, "sand"), 1.84, true],
  [flask(0.09, 0.22, 0.5, "sage"), 2.1, true],
  [bottle(0.09, 0.36, 0.55, "sand"), 1.75, false],
  [bottle(0.065, 0.26, 0.7, "sage"), 2.08, false],
];

function setShapes() {
  const glass: BufferGeometry[] = [];
  const sage: BufferGeometry[] = [];
  const sand: BufferGeometry[] = [];
  const caps: BufferGeometry[] = [];
  for (const [p, x, onShelf] of LAYOUT) {
    const y = onShelf ? SHELF_Y + 0.0225 : 0;
    glass.push(latheGeometry(p.glass, 28).translate(x, y, SHELF_Z));
    if (p.liquid) {
      // Closed across the top: the liquid's surface.
      const surface = p.liquid.profile[p.liquid.profile.length - 1][1];
      (p.liquid.tint === "sage" ? sage : sand).push(latheGeometry([...p.liquid.profile, [0, surface]], 24).translate(x, y, SHELF_Z));
    }
    if (p.cap) {
      const top = p.glass[p.glass.length - 1][1];
      caps.push(new RoundedBoxGeometry(p.cap[0] * 2, p.cap[1], p.cap[0] * 2, 2, p.cap[0] * 0.3).translate(x, y + top + p.cap[1] / 2 - 0.01, SHELF_Z));
    }
  }
  const post = (x: number) => new RoundedBoxGeometry(0.22, 3.4, 0.8, 3, 0.05).translate(x, 1.7, HOOD_Z);
  const hood = [post(-BENCH.half + 0.13), post(BENCH.half - 0.13), new RoundedBoxGeometry(6.36, 0.42, 0.88, 3, 0.06).translate(0, 3.6, HOOD_Z)];
  const lining = (x: number) => new RoundedBoxGeometry(0.02, 3.3, 0.56, 2, 0.008).translate(x, 1.66, HOOD_Z);
  const riser = [
    lining(-BENCH.half + 0.25),
    lining(BENCH.half - 0.25),
    new RoundedBoxGeometry(0.06, SHELF_Y + 0.08, 0.3, 2, 0.025).translate(-2.34, (SHELF_Y + 0.08) / 2, SHELF_Z),
    new RoundedBoxGeometry(0.06, SHELF_Y + 0.08, 0.3, 2, 0.025).translate(2.34, (SHELF_Y + 0.08) / 2, SHELF_Z),
    new RoundedBoxGeometry(4.74, 0.045, 0.32, 2, 0.015).translate(0, SHELF_Y, SHELF_Z),
  ];
  return {
    hood: mergeParts(hood),
    riser: mergeParts(riser),
    strip: new CylinderGeometry(0.025, 0.025, 5.8, 12).rotateZ(Math.PI / 2).translate(0, 3.37, HOOD_Z + 0.2),
    glass: mergeParts(glass),
    sage: mergeParts(sage),
    sand: mergeParts(sand),
    caps: mergeParts(caps),
  };
}

let shapes: ReturnType<typeof setShapes> | null = null;
let strip: MeshBasicMaterial | null = null;

export function ChemistrySet() {
  const tier = useQuality((s) => s.level);
  const g = useMemo(() => (shapes ??= setShapes()), []);
  strip ??= new MeshBasicMaterial({ color: "#fff6e6", toneMapped: false });
  return (
    <group>
      <mesh geometry={g.hood} material={kitMaterial("satin", tier, LAB.chemistry.bench)} />
      <mesh geometry={g.riser} material={kitMaterial("satin", tier, LAB.chemistry.sage)} />
      <mesh geometry={g.strip} material={strip} />
      <mesh geometry={g.sage} material={liquidMaterial(LAB.chemistry.sage, tier, 0.85)} />
      <mesh geometry={g.sand} material={liquidMaterial(LAB.chemistry.gold, tier, 0.85)} />
      <mesh geometry={g.glass} material={kitMaterial("glass", tier)} renderOrder={2} />
      <mesh geometry={g.caps} material={kitMaterial("satin", tier, LAB.chemistry.bench)} />
    </group>
  );
}
