import {
  CanvasTexture,
  BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  Vector2,
  type Material,
  type Texture,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Quality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { FACE_H, FACE_W } from "./face";

/*
 * Ano's parts (DESIGN.md §6), built once from primitives and shared by every
 * Ano on the page. Pieces that move together and share a material are merged
 * into one geometry, so a whole Ano costs about 14 draw calls.
 *
 * Units: the body is centred on the origin; Ano stands about 2.4 tall from
 * hands to antenna tip.
 */

export const HEAD_Y = 1.02;
const HEAD_R = 0.52;
/** The head is a slightly squashed sphere. */
const HEAD_SCALE: [number, number, number] = [1.12, 0.9, 1];
export const SHOULDER: [number, number, number] = [0.5, 0.2, 0];
export const ELBOW_Y = -0.4;
export const ANTENNA_Y = HEAD_Y + HEAD_R * HEAD_SCALE[1] - 0.03;
export const SHADOW_Y = -1.15;

const m4 = new Matrix4();
function placed(g: BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s: [number, number, number] = [1, 1, 1]): BufferGeometry {
  g.applyMatrix4(m4.makeScale(...s));
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

/** Radius of the egg at angle `a` up its profile (−π/2 bottom … π/2 top). */
const egg = (a: number) => Math.cos(a) * 0.47 * (1 + 0.1 * Math.sin(a));

/** An egg, a little wider at the top. */
function bodyGeometry(): BufferGeometry {
  const pts: Vector2[] = [];
  for (let i = 0; i <= 40; i++) {
    const a = -Math.PI / 2 + (i / 40) * Math.PI;
    pts.push(new Vector2(Math.max(1e-4, egg(a)), Math.sin(a) * 0.58));
  }
  return new LatheGeometry(pts, 64);
}

/**
 * The belt: a band that hugs the egg's own curve, flat across the top with
 * rounded edges that meet the shell in a clean seam (a superellipse cross
 * section, sunk a hair into the body so no gap shows).
 */
function beltGeometry(y0 = -0.125, y1 = -0.035, thick = 0.03): BufferGeometry {
  const pts: Vector2[] = [];
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const t = -1 + (2 * i) / steps;
    const y = (y0 + y1) / 2 + (t * (y1 - y0)) / 2;
    const out = thick * (1 - Math.abs(t) ** 4) ** 0.25;
    pts.push(new Vector2(egg(Math.asin(y / 0.58)) + out - 0.004, y));
  }
  return new LatheGeometry(pts, 64);
}

/** The visor's outline in face-texture pixels from its centre: a 244 × 120 rounded rectangle, corner 52. */
function visorOutline(n: number): [number, number][] {
  const hw = 122;
  const hh = 60;
  const r = 52;
  // The perimeter as straight runs and quarter arcs, walked anticlockwise from the right edge's middle.
  const runs: ((t: number) => [number, number])[] = [];
  const lens: number[] = [];
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    runs.push((t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    lens.push(Math.hypot(x1 - x0, y1 - y0));
  };
  const arc = (cx: number, cy: number, from: number) => {
    runs.push((t) => [cx + Math.cos(from + (t * Math.PI) / 2) * r, cy + Math.sin(from + (t * Math.PI) / 2) * r]);
    lens.push((Math.PI / 2) * r);
  };
  line(hw, 0, hw, hh - r);
  arc(hw - r, hh - r, 0);
  line(hw - r, hh, -hw + r, hh);
  arc(-hw + r, hh - r, Math.PI / 2);
  line(-hw, hh - r, -hw, -hh + r);
  arc(-hw + r, -hh + r, Math.PI);
  line(-hw + r, -hh, hw - r, -hh);
  arc(hw - r, -hh + r, (3 * Math.PI) / 2);
  line(hw, -hh + r, hw, 0);
  const total = lens.reduce((a, b) => a + b, 0);
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    let d = (i / n) * total;
    let k = 0;
    while (d > lens[k] && k < lens.length - 1) d -= lens[k++];
    out.push(runs[k](d / lens[k]));
  }
  return out;
}

/**
 * The visor: a smooth glass panel standing just proud of the head, its edge
 * rolled back into the shell, so it has a clean seam all round instead of a
 * cut-out (no alpha mask, no stair steps). UVs match the face canvas, which
 * lights it from inside.
 */
function visorGeometry(): BufferGeometry {
  const n = 128;
  const outline = visorOutline(n);
  // Rings out from the centre: the panel itself, then a rounded lip that tucks into the head.
  const rings: [rho: number, radius: number][] = [];
  for (let k = 0; k <= 12; k++) rings.push([k / 12, HEAD_R * 1.024]);
  rings.push([1.012, HEAD_R * 1.017], [1.022, HEAD_R * 1.006], [1.03, HEAD_R * 0.99]);
  const pos: number[] = [];
  const uv: number[] = [];
  for (const [rho, radius] of rings) {
    for (const [ox, oy] of outline) {
      const u = Math.min(1, Math.max(0, (128 + ox * rho) / FACE_W));
      const v = Math.min(1, Math.max(0, (68 + oy * rho) / FACE_H));
      const phi = Math.PI / 2 - 1.08 + u * 2.16;
      const theta = 0.94 + (1 - v) * 1.3;
      pos.push(-radius * Math.cos(phi) * Math.sin(theta), radius * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta));
      uv.push(u, v);
    }
  }
  const index: number[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    for (let j = 0; j < n; j++) {
      const a = k * n + j;
      const b = (k + 1) * n + j;
      const c = (k + 1) * n + ((j + 1) % n);
      const d = k * n + ((j + 1) % n);
      index.push(a, b, c, a, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return placed(g, 0, HEAD_Y, 0, 0, 0, 0, HEAD_SCALE);
}

/** A rounded puck (the headphone ears), axis along Y before placing. */
function puck(radius: number, half: number, corner: number): BufferGeometry {
  const pts: Vector2[] = [new Vector2(1e-4, -half)];
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    pts.push(new Vector2(radius - corner + Math.cos(a) * corner, -half + corner + Math.sin(a) * corner));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new Vector2(radius - corner + Math.cos(a) * corner, half - corner + Math.sin(a) * corner));
  }
  pts.push(new Vector2(1e-4, half));
  return new LatheGeometry(pts, 32);
}

function handGeometry(): BufferGeometry {
  const parts = [placed(new SphereGeometry(0.105, 20, 14), 0, -0.4, 0, 0, 0, 0, [1, 1.08, 0.78])];
  for (const [x, rz] of [
    [-0.052, 0.12],
    [0, 0],
    [0.052, -0.12],
  ]) {
    parts.push(placed(new CapsuleGeometry(0.033, 0.06, 4, 10), x, -0.5, 0.012, 0, 0, rz));
  }
  parts.push(placed(new CapsuleGeometry(0.032, 0.05, 4, 10), 0.088, -0.37, 0.03, 0, 0, -0.75));
  return mergeGeometries(parts)!;
}

export interface AnoGeometry {
  headWhite: BufferGeometry;
  visor: BufferGeometry;
  headOrange: BufferGeometry;
  antennaStem: BufferGeometry;
  antennaBall: BufferGeometry;
  body: BufferGeometry;
  belt: BufferGeometry;
  upperWhite: BufferGeometry;
  upperOrange: BufferGeometry;
  lowerWhite: BufferGeometry;
  lowerOrange: BufferGeometry;
  shadow: BufferGeometry;
}

let geometry: AnoGeometry | null = null;

export function anoGeometry(): AnoGeometry {
  if (geometry) return geometry;
  const earX = HEAD_R * HEAD_SCALE[0] + 0.015;
  geometry = {
    headWhite: placed(new SphereGeometry(HEAD_R, 64, 40), 0, HEAD_Y, 0, 0, 0, 0, HEAD_SCALE),
    visor: visorGeometry(),
    headOrange: mergeGeometries([placed(puck(0.17, 0.08, 0.05), earX, HEAD_Y - 0.02, -0.02, 0, 0, Math.PI / 2), placed(puck(0.17, 0.08, 0.05), -earX, HEAD_Y - 0.02, -0.02, 0, 0, Math.PI / 2)])!,
    antennaStem: placed(new CylinderGeometry(0.017, 0.024, 0.24, 12), 0, 0.12, 0),
    antennaBall: placed(new SphereGeometry(0.066, 20, 14), 0, 0.27, 0),
    body: bodyGeometry(),
    belt: beltGeometry(),
    upperWhite: placed(new CapsuleGeometry(0.07, 0.2, 6, 16), 0, -0.19, 0),
    upperOrange: new SphereGeometry(0.1, 20, 14),
    lowerWhite: mergeGeometries([placed(new CapsuleGeometry(0.066, 0.16, 6, 16), 0, -0.16, 0), handGeometry()])!,
    lowerOrange: new SphereGeometry(0.082, 20, 14),
    shadow: placed(new PlaneGeometry(1.5, 0.62), 0, SHADOW_Y, 0, -Math.PI / 2),
  };
  return geometry;
}

/** A small canvas texture (the floor shadow). */
function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): Texture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  return new CanvasTexture(c);
}

export interface AnoMaterials {
  white: Material;
  orange: Material;
  shadow: MeshBasicMaterial;
}

const materials = new Map<Quality, AnoMaterials>();

/** Shared materials per tier: physical gloss on High, lighter on Medium, standard on Low. */
export function anoMaterials(tier: Quality): AnoMaterials {
  const hit = materials.get(tier);
  if (hit) return hit;
  const shadowMap = canvasTexture(128, 64, (ctx) => {
    const g = ctx.createRadialGradient(64, 32, 0, 64, 32, 62);
    g.addColorStop(0, "rgba(120,62,20,0.55)");
    g.addColorStop(1, "rgba(120,62,20,0)");
    ctx.setTransform(1, 0, 0, 0.5, 0, 16);
    ctx.fillStyle = g;
    ctx.fillRect(0, -32, 128, 128);
  });
  const set: AnoMaterials =
    tier === "low"
      ? {
          white: new MeshStandardMaterial({ color: P.white, roughness: 0.3, metalness: 0 }),
          orange: new MeshStandardMaterial({ color: P.apricot[500], roughness: 0.5 }),
          shadow: new MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, opacity: 0.85 }),
        }
      : {
          white: new MeshPhysicalMaterial({
            color: P.white,
            roughness: tier === "high" ? 0.16 : 0.22,
            // A softer, blurrier coat: a mirror-sharp one caught the studio's dark floor at grazing angles and left a dotted dark rim round his silhouette.
            clearcoat: tier === "high" ? 0.55 : 0.4,
            clearcoatRoughness: 0.32,
            sheen: tier === "high" ? 0.5 : 0,
            sheenColor: P.apricot[200],
            sheenRoughness: 0.55,
          }),
          orange: new MeshPhysicalMaterial({ color: P.apricot[500], roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
          shadow: new MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, opacity: 0.85 }),
        };
  materials.set(tier, set);
  return set;
}

/** One per Ano: the dark glossy visor lit by its own face texture. */
export function visorMaterial(tier: Quality, face: Texture): Material {
  const common = { color: "#111111", emissive: "#ffffff", emissiveMap: face, emissiveIntensity: 1.55 };
  return tier === "low" ? new MeshStandardMaterial({ ...common, roughness: 0.2 }) : new MeshPhysicalMaterial({ ...common, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 });
}
