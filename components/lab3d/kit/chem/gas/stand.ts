import { CylinderGeometry, ExtrudeGeometry, Shape, type BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeParts } from "../../detail";

/*
 * The gas-law rig's stands (DESIGN.md §8.2): saddles that cradle the
 * syringe's barrel in a notch the shape of the barrel, a base plate for the
 * gauge with a steel post behind it, and a short sleeve of tubing joining the
 * syringe's nozzle to the gauge's port. Built once and merged by material.
 */

/** Saddles at each x under a barrel of radius `r` lying along x at height `axis`, plus the gauge's base plate at `gaugeX`. */
export function saddleGeometry(axis: number, r: number, xs: number[], gaugeX: number): BufferGeometry {
  const half = 0.16;
  const bevel = 0.008;
  const top = axis - r * 0.45;
  // The notch is cut a bevel wider, since the bevel grows the outline.
  const rr = r + 0.004 + bevel;
  const dx = Math.sqrt(rr * rr - (axis - top) ** 2);
  const s = new Shape();
  s.moveTo(-half, bevel);
  s.lineTo(half, bevel);
  s.lineTo(half, top);
  s.lineTo(dx, top);
  s.absarc(0, axis, rr, Math.atan2(top - axis, dx), Math.atan2(top - axis, -dx), true);
  s.lineTo(-half, top);
  s.closePath();
  const depth = 0.06;
  const saddle = new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 32 })
    .translate(0, 0, -depth / 2)
    .rotateY(Math.PI / 2);
  return mergeParts([...xs.map((x) => saddle.clone().translate(x, 0, 0)), new RoundedBoxGeometry(0.3, 0.03, 0.22, 2, 0.012).translate(gaugeX, 0.015, -0.03)]);
}

/** The steel post behind the gauge, from its base plate up to the gauge's centre at `axis`. */
export function postGeometry(gaugeX: number, axis: number): BufferGeometry {
  return new CylinderGeometry(0.014, 0.014, axis - 0.03, 16).translate(gaugeX, 0.03 + (axis - 0.03) / 2, -0.075);
}

/** A sleeve of tubing along x from `x0` to `x1` at height `axis`. */
export function sleeveGeometry(x0: number, x1: number, axis: number): BufferGeometry {
  return new CylinderGeometry(0.024, 0.024, x1 - x0, 24).rotateZ(Math.PI / 2).translate((x0 + x1) / 2, axis, 0);
}
