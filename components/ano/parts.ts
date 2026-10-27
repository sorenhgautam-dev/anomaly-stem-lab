import {
  CanvasTexture,
  CapsuleGeometry,
  CylinderGeometry,
  LatheGeometry,
  Matrix4,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
  type Material,
  type Texture,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Quality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";

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

/** An egg, a little wider at the top. */
function bodyGeometry(): BufferGeometry {
  const pts: Vector2[] = [];
  for (let i = 0; i <= 30; i++) {
    const a = -Math.PI / 2 + (i / 30) * Math.PI;
    pts.push(new Vector2(Math.max(1e-4, Math.cos(a) * 0.47 * (1 + 0.1 * Math.sin(a))), Math.sin(a) * 0.58));
  }
  return new LatheGeometry(pts, 48);
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
    headWhite: placed(new SphereGeometry(HEAD_R, 48, 32), 0, HEAD_Y, 0, 0, 0, 0, HEAD_SCALE),
    // A band of the head's sphere, just outside it: the dark front panel.
    visor: placed(new SphereGeometry(HEAD_R * 1.012, 48, 24, Math.PI / 2 - 1.08, 2.16, 0.94, 1.3), 0, HEAD_Y, 0, 0, 0, 0, HEAD_SCALE),
    headOrange: mergeGeometries([placed(puck(0.17, 0.08, 0.05), earX, HEAD_Y - 0.02, -0.02, 0, 0, Math.PI / 2), placed(puck(0.17, 0.08, 0.05), -earX, HEAD_Y - 0.02, -0.02, 0, 0, Math.PI / 2)])!,
    antennaStem: placed(new CylinderGeometry(0.017, 0.024, 0.24, 12), 0, 0.12, 0),
    antennaBall: placed(new SphereGeometry(0.066, 20, 14), 0, 0.27, 0),
    body: bodyGeometry(),
    belt: placed(new TorusGeometry(0.462, 0.046, 14, 64), 0, -0.08, 0, Math.PI / 2),
    upperWhite: placed(new CapsuleGeometry(0.07, 0.2, 6, 16), 0, -0.19, 0),
    upperOrange: new SphereGeometry(0.1, 20, 14),
    lowerWhite: mergeGeometries([placed(new CapsuleGeometry(0.066, 0.16, 6, 16), 0, -0.16, 0), handGeometry()])!,
    lowerOrange: new SphereGeometry(0.082, 20, 14),
    shadow: placed(new PlaneGeometry(1.5, 0.62), 0, SHADOW_Y, 0, -Math.PI / 2),
  };
  return geometry;
}

/** Soft radial falloff in a small canvas (the floor shadow and the visor's rounded mask). */
function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): Texture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  return new CanvasTexture(c);
}

let visorMask: Texture | null = null;
/** White rounded rectangle on black: cuts the visor band into a rounded panel. */
export function anoVisorMask(): Texture {
  visorMask ??= canvasTexture(256, 136, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 256, 136);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(6, 8, 244, 120, 52);
    ctx.fill();
  });
  return visorMask;
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
            clearcoat: tier === "high" ? 1 : 0.6,
            clearcoatRoughness: 0.08,
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
  const common = { color: "#111111", emissive: "#ffffff", emissiveMap: face, emissiveIntensity: 1.55, alphaMap: anoVisorMask(), alphaTest: 0.5 };
  return tier === "low" ? new MeshStandardMaterial({ ...common, roughness: 0.2 }) : new MeshPhysicalMaterial({ ...common, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 });
}
