import { CanvasTexture, LatheGeometry, MeshBasicMaterial, SRGBColorSpace, Vector2, type BufferGeometry, type Texture } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/*
 * Shared helpers for the §8.2 model standard (DESIGN.md): glass with real
 * wall thickness and a rounded rim, printed details (graduations, labels,
 * colour bands) drawn once on canvases, and decal materials for them.
 * Everything here is created lazily, from inside the 3D scene, never on
 * import (modules are evaluated on the server too).
 */

export type Profile = [radius: number, y: number][];

/**
 * A lathed shell with real wall thickness: up the outer profile, over a
 * rounded rim, and back down the inside to a thick base. `outer` runs from
 * the bottom centre outward and up; the rim is a half circle of the wall's
 * thickness, so glass reads as glass (two surfaces, a bright edge).
 */
export function shellGeometry(outer: Profile, wall: number, base = wall * 1.6, segments = 64): LatheGeometry {
  const pts: Vector2[] = outer.map(([r, y]) => new Vector2(r, y));
  const [rTop, yTop] = outer[outer.length - 1];
  // Rim: a half circle from the outside over to the inside.
  const steps = 8;
  for (let i = 1; i < steps; i++) {
    const a = (i / steps) * Math.PI;
    pts.push(new Vector2(rTop - wall / 2 + (Math.cos(a) * wall) / 2, yTop + (Math.sin(a) * wall) / 2));
  }
  // Inside: the outer profile pulled in by the wall, back down to the base.
  for (let i = outer.length - 1; i >= 1; i--) {
    const [r, y] = outer[i];
    if (y < base) break;
    pts.push(new Vector2(Math.max(0.001, r - wall), y));
  }
  pts.push(new Vector2(Math.max(0.001, outer[1][0] - wall * 1.2), base), new Vector2(0.001, base));
  return new LatheGeometry(pts, segments);
}

/** A profile's radius at height `y`, linear between its points (the wider one where two share a height). */
export function radiusAt(profile: Profile, y: number): number {
  if (y <= profile[0][1]) return profile[0][0];
  for (let i = 1; i < profile.length; i++) {
    const [r0, y0] = profile[i - 1];
    const [r1, y1] = profile[i];
    if (y <= y1) return y1 === y0 ? Math.max(r0, r1) : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return profile[profile.length - 1][0];
}

/** A plain lathe from a profile. */
export function latheGeometry(profile: Profile, segments = 48): LatheGeometry {
  return new LatheGeometry(
    profile.map(([r, y]) => new Vector2(Math.max(0.0005, r), y)),
    segments,
  );
}

/** A rounded profile corner: points along a quarter circle from (r0, y0) turning by `radius`. */
export function corner(cx: number, cy: number, radius: number, from: number, to: number, steps = 6): Profile {
  const out: Profile = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    out.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return out;
}

/**
 * Push a lathed shell's rim outward into a pouring spout around angle 0
 * (the +X side), the way a beaker's lip is pulled into a V.
 */
export function addSpout(g: BufferGeometry, top: number, depth: number, width = 0.42, reach = 0.06): void {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    if (y < top - depth) continue;
    const a = Math.atan2(z, x);
    if (Math.abs(a) > width) continue;
    const k = (1 - Math.abs(a) / width) ** 2 * ((y - (top - depth)) / depth) ** 1.5;
    const r = Math.hypot(x, z);
    const s = (r + reach * k) / r;
    p.setXYZ(i, x * s, y + reach * 0.25 * k, z * s);
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
}

/**
 * Merge parts into one geometry (one draw call). Rounded boxes come
 * unindexed and lathes indexed, so everything is unindexed first.
 */
export function mergeParts(parts: BufferGeometry[]): BufferGeometry {
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
}

const textures = new Map<string, Texture>();

/** A canvas texture drawn once and cached by key. */
export function canvasTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): Texture {
  let t = textures.get(key);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!, w, h);
    t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    textures.set(key, t);
  }
  return t;
}

const decals = new Map<string, MeshBasicMaterial>();

/** A printed decal (graduations, a label) that sits just above a surface. */
export function decalMaterial(key: string, map: Texture, opacity = 1): MeshBasicMaterial {
  let m = decals.get(key);
  if (!m) {
    m = new MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    decals.set(key, m);
  }
  return m;
}

/** Monospace text on canvases in our readout face (DESIGN.md §4). */
export const MONO = '"Martian Mono", ui-monospace, monospace';
export const SANS = '"Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif';
