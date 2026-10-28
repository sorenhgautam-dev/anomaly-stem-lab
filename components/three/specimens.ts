import { BoxGeometry, BufferAttribute, Color, CylinderGeometry, ExtrudeGeometry, Path, Shape, SphereGeometry, TorusGeometry, type BufferGeometry } from "three";
import { addSpout, corner, latheGeometry, mergeParts, radiusAt, shellGeometry, type Profile } from "@/components/lab3d/kit/detail";
import { PALETTE as P } from "@/lib/tokens";

/*
 * The specimens that float behind the site's headlines (DESIGN.md §2 "saturated
 * 3D objects", §8.2 model standard): real lab objects at product-render
 * quality, not abstract blobs. A conical flask, a Griffin beaker (with
 * printed ticks) and a test tube in lathed glass with real wall thickness
 * and liquid inside; an LED with its anvil and post seen through the lens,
 * an AA cell with crimped caps, a resistor, a gear and a water molecule. Each fits a sphere of radius about
 * 1, centred on the origin, so the knock-around physics (shapes.ts) treats
 * them all alike. Built once, lazily (never on import).
 *
 * A specimen is one to three parts, each drawn with one instanced mesh:
 * "glass" (shared clear glass), "liquid" (translucent, coloured per
 * instance: liquids and the LED's lens), "solid" (plastic and metal in their
 * own baked colours) and "accent" (glossy plastic coloured per instance:
 * the cell's band, the resistor's bands, the oxygen atom, the gear). So a
 * page can colour every specimen from one palette and cross-fade it.
 */

export type SpecimenPart = "glass" | "liquid" | "solid" | "accent";

const STEEL = "#cfd2d6";

type Parts = Partial<Record<SpecimenPart, BufferGeometry>>;

/** Give every vertex one colour, so differently coloured parts can share a mesh. */
function paint(g: BufferGeometry, color: string): BufferGeometry {
  const c = new Color(color);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new BufferAttribute(a, 3));
  return g;
}

/** A liquid filling a vessel's inside up to `top`: its profile follows the inner wall, closed across the surface. */
function liquidIn(outer: Profile, wall: number, bottom: number, top: number, segments = 40): BufferGeometry {
  const profile: Profile = [[0.001, bottom]];
  for (let i = 0; i <= 12; i++) {
    const y = bottom + ((top - bottom) * i) / 12;
    profile.push([Math.max(0.001, radiusAt(outer, y) - wall * 1.2), y]);
  }
  profile.push([0.001, top]);
  return latheGeometry(profile, segments);
}

/** A conical flask, 1.84 tall: rounded heel, straight cone, soft shoulder, beaded rim. */
const FLASK: Profile = [[0, 0], ...corner(0.68, 0.11, 0.11, -Math.PI / 2, 0).slice(0, -1), [0.79, 0.11], [0.3, 1.08], [0.262, 1.15], [0.236, 1.22], [0.236, 1.8], [0.256, 1.836]];
/** A Griffin beaker, 1.6 tall: thick base, rounded heel, straight walls, a flared lip (pulled into a spout). */
const BEAKER: Profile = [[0, 0], ...corner(0.6, 0.1, 0.1, -Math.PI / 2, 0).slice(0, -1), [0.7, 0.1], [0.7, 1.54], [0.745, 1.6]];
/** A test tube, 2 tall: round bottom, straight walls, a flared lip. */
const TUBE: Profile = [...corner(0, 0.22, 0.22, -Math.PI / 2, 0, 10), [0.22, 1.95], [0.25, 2]];

function glassAndLiquid(outer: Profile, wall: number, fill: number, centre: number, spout = false): Parts {
  const glass = shellGeometry(outer, wall, wall * 1.8, 64);
  if (spout) addSpout(glass, outer[outer.length - 1][1], 0.28, 0.42, 0.11);
  const liquid = liquidIn(outer, wall, wall * 2, fill);
  return { glass: glass.translate(0, -centre, 0), liquid: liquid.translate(0, -centre, 0) };
}

/** An LED: a domed lens on a flange (see-through, tinted per instance), the anvil, post and reflector cup inside, and two legs (the anode longer). */
function led(): Parts {
  const lens = latheGeometry([[0, 0], [0.4, 0], [0.41, 0.014], [0.41, 0.08], [0.34, 0.086], [0.34, 0.5], ...corner(0, 0.5, 0.34, 0, Math.PI / 2, 12).slice(1)], 48);
  const anvil = new CylinderGeometry(0.11, 0.07, 0.16, 18).translate(0.07, 0.3, 0);
  const cup = latheGeometry([[0.001, 0.32], [0.05, 0.32], [0.075, 0.385], [0.065, 0.39]], 18).translate(0.07, 0, 0);
  const post = new CylinderGeometry(0.03, 0.03, 0.5, 10).translate(-0.11, 0.25, 0);
  const wire = new CylinderGeometry(0.006, 0.006, 0.22, 6).rotateZ(1.2).translate(-0.02, 0.43, 0);
  const anode = new CylinderGeometry(0.032, 0.032, 1.02, 12).translate(-0.11, -0.51, 0);
  const cathode = new CylinderGeometry(0.032, 0.032, 0.82, 12).translate(0.11, -0.41, 0);
  return {
    liquid: lens.translate(0, 0.1, 0),
    solid: mergeParts([paint(anvil, STEEL), paint(cup, STEEL), paint(post, STEEL), paint(wire, P.ink[700]), paint(anode, STEEL), paint(cathode, STEEL)]).translate(0, 0.1, 0),
  };
}

/** An AA cell: a white printed sleeve with a coloured band at the + end, crimped steel caps and the + nub. */
function cell(): Parts {
  const white = latheGeometry([[0.29, 0.02], [0.32, 0.05], [0.32, 1.3]], 40);
  const band = latheGeometry([[0.32, 1.3], [0.32, 1.62], [0.29, 1.66]], 40);
  const minus = latheGeometry([[0, 0], [0.285, 0], [0.285, 0.03]], 32);
  const plus = latheGeometry([[0.285, 1.64], [0.285, 1.68], [0.12, 1.68], [0.11, 1.75], [0, 1.755]], 32);
  // The crimped rims where the steel caps meet the sleeve.
  const rims = [0.035, 1.645].map((y) => new TorusGeometry(0.3, 0.012, 8, 40).rotateX(Math.PI / 2).translate(0, y, 0));
  return {
    solid: mergeParts([paint(white, P.white), paint(minus, STEEL), paint(plus, STEEL), ...rims.map((r) => paint(r, STEEL))]).translate(0, -0.88, 0),
    accent: paint(band, P.white).translate(0, -0.88, 0),
  };
}

/** A resistor: a dog-bone body with four colour bands (two in the accent) and a lead out of each end. */
function resistor(): Parts {
  const body = latheGeometry([[0, -0.5], [0.12, -0.5], [0.2, -0.44], [0.215, -0.3], [0.17, -0.2], [0.17, 0.2], [0.215, 0.3], [0.2, 0.44], [0.12, 0.5], [0, 0.5]], 40);
  const band = (y: number, r: number, color: string) => paint(new CylinderGeometry(r, r, 0.07, 40, 1, true).translate(0, y, 0), color);
  return {
    solid: mergeParts([
      paint(body, P.cream[200]),
      band(-0.32, 0.218, P.ink[900]),
      band(0.06, 0.174, P.ink[900]),
      paint(new CylinderGeometry(0.026, 0.026, 0.46, 10).translate(0, 0.72, 0), STEEL),
      paint(new CylinderGeometry(0.026, 0.026, 0.46, 10).translate(0, -0.72, 0), STEEL),
    ]),
    accent: mergeParts([band(-0.1, 0.174, P.white), band(0.32, 0.218, P.white)]),
  };
}

/** A spur gear: 14 teeth with flat tips, a bored hub and four lightening holes, bevelled edges. */
function gear(): BufferGeometry {
  const teeth = 14;
  const outer = 0.9;
  const root = 0.74;
  const s = new Shape();
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const w = (Math.PI * 2) / teeth;
    const pts: [number, number][] = [
      [root, a],
      [outer, a + w * 0.18],
      [outer, a + w * 0.42],
      [root, a + w * 0.6],
    ];
    pts.forEach(([r, t], k) => (i === 0 && k === 0 ? s.moveTo(Math.cos(t) * r, Math.sin(t) * r) : s.lineTo(Math.cos(t) * r, Math.sin(t) * r)));
  }
  s.closePath();
  const hole = (x: number, y: number, r: number) => {
    const p = new Path();
    p.absarc(x, y, r, 0, Math.PI * 2, true);
    return p;
  };
  s.holes.push(hole(0, 0, 0.16));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    s.holes.push(hole(Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0.13));
  }
  const g = new ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 3, curveSegments: 20 });
  g.translate(0, 0, -0.1);
  return paint(g, P.white);
}

/** Printed graduation ticks on a vessel's wall: short white bars at `ys`, on the radius the profile has there. */
function ticks(outer: Profile, ys: number[], centre: number): BufferGeometry {
  return mergeParts(ys.map((y, i) => paint(new BoxGeometry(i % 2 ? 0.08 : 0.15, 0.014, 0.012).translate(radiusAt(outer, y) + 0.004, y - centre, 0).rotateY(-0.5), P.white)));
}

/** A water molecule, ball and stick: the oxygen in the accent colour, two white hydrogens at 104.5°. */
function molecule(): Parts {
  const half = ((104.5 / 2) * Math.PI) / 180;
  const parts: BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const dir = { x: Math.sin(half) * side, y: -Math.cos(half) };
    parts.push(paint(new SphereGeometry(0.3, 32, 22).translate(dir.x * 0.86, dir.y * 0.86, 0), P.white));
    const stick = new CylinderGeometry(0.075, 0.075, 0.5, 16).rotateZ(-side * half).translate(dir.x * 0.5, dir.y * 0.5, 0);
    parts.push(paint(stick, P.white));
  }
  return { solid: mergeParts(parts).translate(0, 0.26, 0), accent: paint(new SphereGeometry(0.46, 40, 28), P.white).translate(0, 0.26, 0) };
}

export type SpecimenKind = "flask" | "beaker" | "tube" | "led" | "cell" | "resistor" | "gear" | "molecule" | "sphere";

const builders: Record<SpecimenKind, () => Parts> = {
  flask: () => glassAndLiquid(FLASK, 0.034, 0.62, 0.92),
  beaker: () => ({ ...glassAndLiquid(BEAKER, 0.032, 0.92, 0.8, true), solid: ticks(BEAKER, [0.36, 0.52, 0.68, 0.84, 1.0, 1.16, 1.32], 0.8) }),
  tube: () => glassAndLiquid(TUBE, 0.022, 1.0, 1.0),
  led,
  cell,
  resistor,
  gear: () => ({ accent: gear() }),
  molecule,
  sphere: () => ({ accent: paint(new SphereGeometry(1, 40, 28), P.white) }),
};

const built = new Map<SpecimenKind, Parts>();

/** A specimen's parts (built once, then shared by every field). */
export function specimenParts(kind: SpecimenKind): Parts {
  let parts = built.get(kind);
  if (!parts) {
    parts = builders[kind]();
    built.set(kind, parts);
  }
  return parts;
}
