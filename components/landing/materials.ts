import {
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Material,
  type MeshPhysicalMaterialParameters,
} from "three";
import { TOKENS } from "@/lib/tokens";
import { createTitleMaterial } from "./title-material";

/*
 * Shared PBR materials, created once and reused by every object so the GPU
 * compiles each shader a single time. Glass uses the built-in physical
 * transmission (one shared transmission pass) rather than drei's
 * MeshTransmissionMaterial, which renders the scene again per material;
 * that one is saved for the lens cursor.
 */

function gloss(color: string, overrides: MeshPhysicalMaterialParameters = {}) {
  return new MeshPhysicalMaterial({
    color: new Color(color),
    roughness: 0.17,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    ...overrides,
  });
}

function glow(color: string, intensity: number) {
  // Emissive above 1 is what the bloom pass picks up (threshold 1).
  return new MeshStandardMaterial({
    color: new Color(color),
    emissive: new Color(color),
    emissiveIntensity: intensity,
    toneMapped: false,
  });
}

function build() {
  return {
    // Glossy plastic in three colours (white, blue, black), Lusion-style.
    pearl: gloss(TOKENS.pearl, { roughness: 0.24, clearcoatRoughness: 0.06 }),
    // White base for instanced parts tinted per instance (pearl, signal, void).
    plastic: gloss("#ffffff", { roughness: 0.24, clearcoatRoughness: 0.06 }),
    signal: gloss(TOKENS.signal, { roughness: 0.26, clearcoatRoughness: 0.08 }),
    dark: gloss(TOKENS.void, { roughness: 0.3, clearcoatRoughness: 0.05 }),
    chrome: new MeshPhysicalMaterial({
      color: new Color(TOKENS.pearl),
      metalness: 1,
      roughness: 0.12,
    }),
    steel: new MeshPhysicalMaterial({
      color: new Color(TOKENS.pearl).multiplyScalar(0.8),
      metalness: 1,
      roughness: 0.24,
      clearcoat: 0.5,
      envMapIntensity: 1.6,
    }),
    glass: new MeshPhysicalMaterial({
      color: new Color(TOKENS.pearl),
      transmission: 1,
      thickness: 0.35,
      roughness: 0.04,
      ior: 1.45,
      attenuationColor: new Color(TOKENS.lilac),
      attenuationDistance: 2.5,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
    }),
    thickGlass: new MeshPhysicalMaterial({
      color: new Color(TOKENS.pearl),
      transmission: 1,
      thickness: 0.9,
      roughness: 0.03,
      ior: 1.52,
      attenuationColor: new Color(TOKENS.lilac),
      attenuationDistance: 1.6,
      iridescence: 0.2,
      clearcoat: 1,
    }),
    liquid: gloss(TOKENS.signal, {
      roughness: 0.08,
      emissive: new Color(TOKENS.signal),
      emissiveIntensity: 0.45,
    }),
    // Glossy pearl with custom GLSL: rim, sheen, Break cracks, Rebuild seams.
    title: createTitleMaterial(),
    glowLilac: glow(TOKENS.lilac, 4),
    glowSignal: glow(TOKENS.signal, 3.5),
    glowGold: glow(TOKENS.resolve, 5),
    glowAnomaly: glow(TOKENS.anomaly, 4),
  } satisfies Record<string, Material>;
}

let cache: ReturnType<typeof build> | null = null;

export function mats(): ReturnType<typeof build> {
  cache ??= build();
  return cache;
}
