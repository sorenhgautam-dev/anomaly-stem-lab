import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/*
 * Room props built from primitives in code (CLAUDE.md §3.4: original assets
 * only). Created once and shared. Glassware is a silhouette, not a model:
 * a lathe outline plus a smaller lathe for the liquid inside.
 */

type Profile = [number, number][];

/** Merge parts that may mix indexed and non-indexed geometry. */
const merge = (parts: BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));

const lathe = (profile: Profile, segments = 40) => new LatheGeometry(profile.map(([x, y]) => new Vector2(x, y)), segments);

/** The lower part of a profile, pulled in a little: the liquid inside a vessel. */
function liquid(profile: Profile, level: number, inset = 0.004): Profile {
  const out: Profile = [];
  for (const [x, y] of profile) {
    if (y > level) break;
    out.push([Math.max(0, x - inset), y + inset]);
  }
  const top = out[out.length - 1];
  out.push([top[0], level], [0, level]);
  return out;
}

const PROFILES: Record<string, { glass: Profile; level: number }> = {
  erlenmeyer: { glass: [[0, 0], [0.105, 0], [0.11, 0.008], [0.098, 0.07], [0.042, 0.19], [0.034, 0.26], [0.038, 0.268]], level: 0.07 },
  beaker: { glass: [[0, 0], [0.068, 0], [0.072, 0.006], [0.072, 0.15], [0.08, 0.158]], level: 0.09 },
  round: { glass: [[0, 0], [0.04, 0.006], [0.075, 0.035], [0.088, 0.08], [0.075, 0.125], [0.03, 0.155], [0.024, 0.25], [0.028, 0.256]], level: 0.075 },
  bottle: { glass: [[0, 0], [0.05, 0], [0.052, 0.006], [0.052, 0.13], [0.04, 0.16], [0.02, 0.17], [0.02, 0.2]], level: 0.1 },
  tube: { glass: [[0, 0], [0.008, 0.002], [0.013, 0.012], [0.014, 0.022], [0.014, 0.17], [0.017, 0.174]], level: 0.09 },
};

export type Vessel = keyof typeof PROFILES;
export const VESSELS = Object.keys(PROFILES) as Vessel[];

function tools(): BufferGeometry {
  // A wrench: open jaw at the top, a ring at the bottom.
  const wrench = new Shape();
  wrench.moveTo(-0.018, -0.2);
  wrench.lineTo(0.018, -0.2);
  wrench.lineTo(0.018, 0.13);
  wrench.lineTo(0.045, 0.16);
  wrench.lineTo(0.045, 0.22);
  wrench.lineTo(0.015, 0.22);
  wrench.lineTo(0.015, 0.18);
  wrench.lineTo(-0.015, 0.18);
  wrench.lineTo(-0.015, 0.22);
  wrench.lineTo(-0.045, 0.22);
  wrench.lineTo(-0.045, 0.16);
  wrench.lineTo(-0.018, 0.13);
  wrench.closePath();
  const extrude = { depth: 0.012, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2 };
  const w = new ExtrudeGeometry(wrench, extrude);
  const ring = new TorusGeometry(0.036, 0.012, 8, 24);
  ring.translate(0, -0.23, 0.006);

  // Pliers: two handles crossing at a pivot.
  const handle = new Shape();
  handle.moveTo(-0.012, -0.18);
  handle.lineTo(0.012, -0.18);
  handle.lineTo(0.01, 0.05);
  handle.lineTo(0.004, 0.13);
  handle.lineTo(-0.004, 0.13);
  handle.lineTo(-0.01, 0.05);
  handle.closePath();
  const p1 = new ExtrudeGeometry(handle, extrude);
  p1.rotateZ(0.16);
  p1.translate(0.42, 0, 0);
  const p2 = new ExtrudeGeometry(handle, extrude);
  p2.rotateZ(-0.16);
  p2.translate(0.42, 0, 0.012);

  // Screwdrivers: handle plus shaft, hanging point down.
  const drivers = [0.66, 0.74, 0.82].map((x, i) => {
    const grip = new CylinderGeometry(0.018, 0.016, 0.11, 12);
    grip.translate(x, 0.12, 0.02);
    const shaft = new CylinderGeometry(0.004, 0.004, 0.14 + i * 0.03, 8);
    shaft.translate(x, -0.005 - i * 0.015, 0.02);
    return merge([grip, shaft]);
  });

  // A hammer and a long ruler.
  const head = new BoxGeometry(0.16, 0.05, 0.04);
  head.translate(1.1, 0.18, 0.02);
  const shaft = new BoxGeometry(0.026, 0.34, 0.022);
  shaft.translate(1.1, 0.0, 0.02);
  const ruler = new BoxGeometry(0.03, 0.6, 0.006);
  ruler.translate(-0.25, 0.0, 0.004);
  const coil = new TorusGeometry(0.08, 0.022, 10, 32);
  coil.translate(1.42, 0.05, 0.03);
  return merge([w, ring, p1, p2, ...drivers, head, shaft, ruler, coil]);
}

function build() {
  const vessels = Object.fromEntries(
    VESSELS.map((v) => [v, { glass: lathe(PROFILES[v].glass), liquid: lathe(liquid(PROFILES[v].glass, PROFILES[v].level)) }]),
  ) as Record<Vessel, { glass: LatheGeometry; liquid: LatheGeometry }>;
  return {
    box: new BoxGeometry(1, 1, 1),
    rounded: new RoundedBoxGeometry(1, 1, 1, 3, 0.08),
    plane: new PlaneGeometry(1, 1),
    beam: new CylinderGeometry(0.18, 0.9, 1, 40, 1, true).translate(0, -0.5, 0),
    rod: new CylinderGeometry(0.5, 0.5, 1, 16),
    disc: new CylinderGeometry(0.5, 0.5, 1, 32),
    ring: new TorusGeometry(0.5, 0.06, 8, 40),
    sphere: new SphereGeometry(0.5, 24, 16),
    wheel: new CylinderGeometry(0.5, 0.5, 1, 24).rotateZ(Math.PI / 2),
    vessels,
    tools: tools(),
  };
}

let cache: ReturnType<typeof build> | null = null;

export function roomGeos(): ReturnType<typeof build> {
  cache ??= build();
  return cache;
}
