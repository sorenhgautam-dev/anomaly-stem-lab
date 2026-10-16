import {
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Path,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/*
 * Every landing object is built from primitives in code (CLAUDE.md §3.4:
 * original assets only). Geometries are created once and shared.
 */

type Profile = [number, number][];

function lathe(profile: Profile, segments = 64): LatheGeometry {
  return new LatheGeometry(
    profile.map(([x, y]) => new Vector2(x, y)),
    segments,
  );
}

function arc(cx: number, cy: number, r: number, from: number, to: number, steps: number): Profile {
  const pts: Profile = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function gear(teeth: number, outer: number, root: number, hole: number): ExtrudeGeometry {
  const shape = new Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: [number, number][] = [
      [root, a],
      [outer, a + step * 0.16],
      [outer, a + step * 0.44],
      [root, a + step * 0.6],
    ];
    pts.forEach(([r, ang], j) => {
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      if (i === 0 && j === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  const centre = new Path();
  centre.absarc(0, 0, hole, 0, Math.PI * 2, true);
  shape.holes.push(centre);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const window = new Path();
    window.absarc(Math.cos(a) * 0.27, Math.sin(a) * 0.27, 0.065, 0, Math.PI * 2, true);
    shape.holes.push(window);
  }
  const geo = new ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.018,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geo.translate(0, 0, -0.07);
  return geo;
}

function bulbMetal(base: BufferGeometry): BufferGeometry {
  const wire = new CylinderGeometry(0.007, 0.007, 0.4, 6);
  const left = wire.clone().translate(-0.06, 0.06, 0);
  const right = wire.clone().translate(0.06, 0.06, 0);
  const merged = mergeGeometries([base.toNonIndexed(), left.toNonIndexed(), right.toNonIndexed()]);
  wire.dispose();
  return merged ?? base;
}

function build() {
  const bulbOuter = arc(0, 0.28, 0.34, Math.PI / 2, -Math.PI / 4, 24);
  const bulbInner = arc(0, 0.28, 0.315, -Math.PI / 4, Math.PI / 2, 24);
  const screw: Profile = [];
  for (let i = 0; i <= 6; i++) {
    const y = -0.16 - i * 0.05;
    screw.push([0.152, y], [0.166, y - 0.025]);
  }

  return {
    // Atom
    nucleon: new SphereGeometry(0.12, 32, 24),
    orbit: new TorusGeometry(0.6, 0.014, 10, 120),
    electron: new SphereGeometry(0.055, 16, 12),

    // Beaker: a lathed glass shell with a lip, plus the liquid inside.
    beaker: lathe([
      [0, -0.5],
      [0.36, -0.5],
      [0.39, -0.47],
      [0.4, 0.42],
      [0.44, 0.48],
      [0.44, 0.5],
      [0.41, 0.5],
      [0.36, 0.44],
      [0.355, -0.44],
      [0, -0.44],
    ]),
    beakerLiquid: new CylinderGeometry(0.35, 0.345, 0.5, 48),

    // Erlenmeyer flask
    flask: lathe([
      [0, -0.55],
      [0.46, -0.55],
      [0.5, -0.5],
      [0.5, -0.46],
      [0.16, 0.18],
      [0.15, 0.52],
      [0.19, 0.56],
      [0.19, 0.6],
      [0.11, 0.6],
      [0.11, 0.2],
      [0.445, -0.46],
      [0.44, -0.49],
      [0, -0.49],
    ]),
    flaskLiquid: lathe([
      [0, -0.48],
      [0.43, -0.48],
      [0.3, -0.2],
      [0, -0.2],
    ]),

    gear: gear(12, 0.5, 0.41, 0.13),

    // Light bulb: glass, screw base, glowing filament.
    bulbGlass: lathe([
      ...bulbOuter,
      [0.14, -0.12],
      [0.14, -0.16],
      [0.115, -0.16],
      [0.115, -0.12],
      ...bulbInner,
    ]),
    // Screw base and the two filament supports share one chrome mesh.
    bulbMetal: bulbMetal(lathe([[0, -0.16], ...screw, [0.07, -0.53], [0, -0.54]], 48)),
    filament: new TorusGeometry(0.065, 0.011, 8, 48),

    // Tiny robot
    robotBody: new RoundedBoxGeometry(0.56, 0.5, 0.42, 4, 0.1),
    robotHead: new RoundedBoxGeometry(0.44, 0.32, 0.36, 4, 0.09),
    robotVisor: new RoundedBoxGeometry(0.34, 0.15, 0.04, 3, 0.02),
    robotEye: new SphereGeometry(0.035, 16, 12),
    wheel: new CylinderGeometry(0.15, 0.15, 0.08, 32),
    antenna: new CylinderGeometry(0.012, 0.012, 0.16, 8),
    antennaTip: new SphereGeometry(0.035, 16, 12),

    // Hero balls, Ano, lens
    ball: new SphereGeometry(1, 64, 48),
  } satisfies Record<string, BufferGeometry>;
}

let cache: ReturnType<typeof build> | null = null;

export function geos(): ReturnType<typeof build> {
  cache ??= build();
  return cache;
}
