import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, type Material } from "three";
import { RAMP } from "@/lib/tokens";

/*
 * PBR materials for the lab rooms, created once and shared so each shader
 * compiles a single time. Glass is faked with a thin, glossy, transparent
 * physical material plus the environment map (CLAUDE.md §9: no transmission
 * in the labs).
 */

function emissive(hex: string, intensity: number) {
  // Emissive above 1 is what the bloom pass picks up.
  return new MeshStandardMaterial({ color: new Color("#000000"), emissive: new Color(hex), emissiveIntensity: intensity, toneMapped: false });
}

function build() {
  return {
    /** Black epoxy bench top: glossy, so it mirrors the light strips. */
    benchTop: new MeshPhysicalMaterial({ color: new Color("#030409"), roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.45 }),
    benchBody: new MeshStandardMaterial({ color: new Color(RAMP.depth[900]), roughness: 0.65, metalness: 0.2, envMapIntensity: 0.6 }),
    /** Anodised dark metal for frames, devices and tools. */
    metal: new MeshPhysicalMaterial({ color: new Color("#18213a"), metalness: 0.85, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 1.3 }),
    darkMetal: new MeshPhysicalMaterial({ color: new Color("#0b1020"), metalness: 0.7, roughness: 0.45, envMapIntensity: 0.9 }),
    chrome: new MeshPhysicalMaterial({ color: new Color(RAMP.mist[200]), metalness: 1, roughness: 0.14, envMapIntensity: 1.4 }),
    /** Matte plastic for device bodies. */
    plastic: new MeshPhysicalMaterial({ color: new Color("#0d1428"), roughness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.25, envMapIntensity: 0.8 }),
    glass: new MeshPhysicalMaterial({
      color: new Color(RAMP.ion[100]),
      transparent: true,
      opacity: 0.16,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.8,
      depthWrite: false,
      side: DoubleSide,
    }),
    sash: new MeshPhysicalMaterial({
      color: new Color(RAMP.ion[200]),
      transparent: true,
      opacity: 0.07,
      roughness: 0.02,
      clearcoat: 1,
      envMapIntensity: 2.2,
      depthWrite: false,
    }),
    floor: new MeshStandardMaterial({ color: new Color(RAMP.depth[950]), roughness: 0.42, metalness: 0.3, envMapIntensity: 0.5 }),
    stripMist: emissive(RAMP.ion[100], 1.15),
    stripIon: emissive(RAMP.ion[300], 2.6),
    stripGlow: emissive(RAMP.glow[400], 2.2),
    screenGlow: emissive(RAMP.glow[200], 1.4),
  } satisfies Record<string, Material>;
}

let cache: ReturnType<typeof build> | null = null;

export function roomMats(): ReturnType<typeof build> {
  cache ??= build();
  return cache;
}
