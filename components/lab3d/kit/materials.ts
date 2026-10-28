import { CanvasTexture, Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, SpriteMaterial, type Material, type Texture } from "three";
import type { Quality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";

/*
 * Shared materials for the 3D apparatus kit (DESIGN.md §8), in one soft
 * clay look: matte solids in a narrow roughness band with a soft sheen,
 * satin metals, faked glass (real transmission is kept for one object per
 * screen, CLAUDE.md §9) and translucent liquids. Built once per tier; Low
 * swaps physical materials for standard ones.
 */

type Kind =
  | "plastic"
  | "clay"
  | "ink"
  | "metal"
  | "steel"
  | "copper"
  | "glass"
  | "film"
  | "rubber"
  | "orange"
  | "volt"
  | "board"
  | "black"
  | "insulation"
  | "gold"
  | "sand"
  | "sage"
  | "teal"
  | "satin"
  | "matte";

function make(kind: Kind, tier: Quality, tint = "#ffffff"): Material {
  const low = tier === "low";
  // Low: the same look on a standard material, passing only the keys that are set (three warns on undefined).
  const phys = (o: ConstructorParameters<typeof MeshPhysicalMaterial>[0]) => {
    if (!low) return new MeshPhysicalMaterial(o);
    const { color, roughness = 0.4, metalness = 0, transparent, opacity, side, depthWrite } = o ?? {};
    return new MeshStandardMaterial(defined({ color, roughness, metalness, transparent, opacity, side, depthWrite }));
  };
  // The soft clay look (owner's brief, 28 October 2026): every solid is matte in one narrow roughness band, with no mirror coat and a soft sheen that catches the rim light. Only glass, film and liquids stay glossy.
  const clay = (color: string, roughness = 0.62) => phys({ color, roughness, sheen: 0.35, sheenRoughness: 0.8, sheenColor: new Color(color).lerp(new Color(P.white), 0.5) });
  switch (kind) {
    case "plastic":
      return clay(P.white, 0.58);
    case "clay":
      return clay(tint, 0.66);
    case "board":
      return clay(P.cream[50], 0.64);
    case "ink":
      return clay("#1d1b1a", 0.62);
    case "metal":
      // Satin metal: soft highlights, never mirror-sharp.
      return phys({ color: "#d4d8de", metalness: 0.75, roughness: 0.45 });
    case "copper":
      return phys({ color: "#d58a52", metalness: 0.75, roughness: 0.45 });
    case "rubber":
      return clay("#2a2826", 0.72);
    case "orange":
      return clay(P.apricot[500], 0.6);
    case "volt":
      return clay(P.volt[500], 0.6);
    case "glass":
      // Faked glass (real transmission is kept for one object, CLAUDE.md §9): thin, glossy, bright at its walls.
      return phys({ color: P.white, transparent: true, opacity: low ? 0.3 : 0.2, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.6, side: DoubleSide, depthWrite: false });
    case "film":
      // Zip-bag film: soft, milky plastic, not glass: more opaque and rougher, with a satin sheen on its crinkles and no mirror coat.
      return phys({ color: P.white, transparent: true, opacity: low ? 0.42 : 0.36, roughness: 0.38, clearcoat: 0.15, clearcoatRoughness: 0.5, sheen: 0.8, sheenColor: P.white, specularIntensity: 0.6, envMapIntensity: 0.9, side: DoubleSide, depthWrite: false });
    case "steel":
      // Brushed stainless, satin: the field rim, the scale's pan, terminals and contacts.
      return phys({ color: "#cfd2d6", metalness: 0.75, roughness: 0.45 });
    case "black":
      return clay(LAB.robotics.trim, 0.64);
    case "insulation":
      return clay("#2b2c31", 0.6);
    case "gold":
      return clay(LAB.robotics.gold, 0.56);
    case "sand":
      return clay(LAB.chemistry.gold, 0.6);
    case "sage":
      return clay(LAB.chemistry.sage, 0.64);
    case "teal":
      return clay(LAB.robotics.teal, 0.58);
    case "satin":
      return clay(tint, 0.6);
    case "matte":
      return clay(tint, 0.68);
  }
}

/** The object without its undefined keys. */
function defined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

const cache = new Map<string, Material>();

export function kitMaterial(kind: Kind, tier: Quality, tint?: string): Material {
  const key = `${kind}|${tier}|${tint ?? ""}`;
  let m = cache.get(key);
  if (!m) {
    m = make(kind, tier, tint);
    cache.set(key, m);
  }
  return m;
}

/** A translucent liquid in a colour (shared per colour and tier). */
export function liquidMaterial(color: string, tier: Quality, opacity = 0.82): Material {
  const key = `liquid|${color}|${tier}|${opacity}`;
  let m = cache.get(key);
  if (!m) {
    m =
      tier === "low"
        ? new MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.15 })
        : new MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: 0.08, clearcoat: 1, emissive: new Color(color).multiplyScalar(0.12) });
    cache.set(key, m);
  }
  return m;
}

/** A material whose colour or glow changes per frame: one per object, never shared. */
export function ownMaterial(color: string, tier: Quality, opts: { emissive?: string; transparent?: boolean; opacity?: number } = {}): MeshStandardMaterial | MeshPhysicalMaterial {
  const base = { color, emissive: opts.emissive ?? "#000000", transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1 };
  return tier === "low" ? new MeshStandardMaterial({ ...base, roughness: 0.3 }) : new MeshPhysicalMaterial({ ...base, roughness: 0.15, clearcoat: 0.8 });
}

let glow: Texture | null = null;
/** A soft round glow (white centre to transparent), tinted by the sprite colour. */
export function glowTexture(): Texture {
  if (glow) return glow;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  // A soft falloff with no visible rim: most of the light in the middle, a long tail to nothing.
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,255,255,0.62)");
  g.addColorStop(0.45, "rgba(255,255,255,0.18)");
  g.addColorStop(0.75, "rgba(255,255,255,0.04)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glow = new CanvasTexture(c);
  return glow;
}

/** A glow sprite material in one colour. Normal blending: additive vanishes on cream (DESIGN.md §8). */
export function glowMaterial(color: string): SpriteMaterial {
  return new SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, opacity: 0 });
}
