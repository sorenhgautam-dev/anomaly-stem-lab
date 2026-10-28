import { Color, MeshPhysicalMaterial, MeshStandardMaterial, type Material } from "three";
import type { Quality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";

/*
 * What a living cell is made of, in the lab kit (DESIGN.md §3.4 "cells are
 * soft, clean spheres and blobs in the lab's palette", §8 "cells and
 * tissue"): a soft, slightly see-through membrane that wobbles gently, each
 * cell on its own phase, with a soft rim of light at its edge; and a darker
 * nucleus inside. Both are instanced, so a whole colony is two draw calls.
 * The wobble and the rim are added to the standard PBR shaders, so cells
 * keep the lab's lighting and reflections. Never red: the colour is always
 * one of the lab's own.
 */

export interface CellMaterials {
  membrane: Material;
  nucleus: Material;
  /** Advance the wobble (seconds). */
  tick: (t: number) => void;
}

/** Each instance's own wobble: a few slow sine waves over the surface, phased by where the cell sits. */
const WOBBLE = /* glsl */ `
  #ifdef USE_INSTANCING
    vec3 seed = instanceMatrix[3].xyz * 9.0;
  #else
    vec3 seed = vec3(0.0);
  #endif
  float wob = sin(position.x * 3.1 + uTime * 1.3 + seed.x) * 0.5 + sin(position.y * 2.7 + uTime * 1.1 + seed.y) * 0.3 + sin(position.z * 3.7 + uTime * 0.9 + seed.z) * 0.2;
  transformed += normal * wob * uWobble;
`;

const RIM = /* glsl */ `
  float rim = pow(1.0 - clamp(dot(normalize(vViewPosition), -normal) * -1.0, 0.0, 1.0), 2.2);
  totalEmissiveRadiance += uRim * rim;
`;

function addLife(material: MeshStandardMaterial | MeshPhysicalMaterial, rim: Color, wobble: number, time: { value: number }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.uniforms.uWobble = { value: wobble };
    shader.uniforms.uRim = { value: rim };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uWobble;").replace("#include <begin_vertex>", `#include <begin_vertex>\n${WOBBLE}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uRim;").replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${RIM}`);
  };
  // One program per wobble strength and rim colour, shared by every colony that uses them.
  material.customProgramCacheKey = () => `cell-${wobble}-${rim.getHexString()}`;
}

/**
 * A colony's two materials. `see` makes the whole cell see-through (a ghost:
 * the student's idea). Low tier keeps the wobble but drops clearcoat and sheen.
 */
export function cellMaterials(color: string, tier: Quality, { see = 1 }: { see?: number } = {}): CellMaterials {
  const time = { value: 0 };
  const base = new Color(color);
  // The rim is the cell's own colour, lifted toward white: a soft glow at the edge, never a hard outline.
  const rim = base.clone().lerp(new Color(P.white), 0.55).multiplyScalar(0.45 * see);
  const membraneOpacity = 0.74 * see;
  const membrane =
    tier === "low"
      ? new MeshStandardMaterial({ color: base, roughness: 0.35, transparent: true, opacity: membraneOpacity, depthWrite: false })
      : new MeshPhysicalMaterial({ color: base, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.35, sheen: 1, sheenColor: base.clone().lerp(new Color(P.white), 0.5), sheenRoughness: 0.5, transparent: true, opacity: membraneOpacity, depthWrite: false });
  addLife(membrane, rim, 0.06, time);
  // The nucleus: the same hue, much deeper, matte.
  const deep = base.clone().lerp(new Color(P.ink[900]), 0.45);
  const nucleus = new MeshStandardMaterial({ color: deep, roughness: 0.6, transparent: see < 1, opacity: see < 1 ? 0.5 * see : 1, depthWrite: see >= 1 });
  addLife(nucleus, new Color(0, 0, 0), 0.08, time);
  return {
    membrane,
    nucleus,
    tick: (t) => {
      time.value = t;
    },
  };
}

/** A steady pseudo-random number in [0, 1) for instance i: varied sizes that don't change between frames. */
export function hash01(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
