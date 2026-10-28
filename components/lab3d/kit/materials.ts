import { CanvasTexture, Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, SpriteMaterial, type Material, type Texture } from "three";
import type { Quality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";

/*
 * Shared materials for the 3D apparatus kit (DESIGN.md §8): glossy white
 * plastic, matte orange, ink, metal, faked glass (real transmission is kept
 * for one object per screen, CLAUDE.md §9) and translucent liquids. Built
 * once per tier; Low swaps physical materials for standard ones.
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
  switch (kind) {
    case "plastic":
      return phys({ color: P.white, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15 });
    case "clay":
      return phys({ color: tint, roughness: 0.75, clearcoat: 0.15, sheen: 0.4, sheenColor: tint });
    case "board":
      return phys({ color: P.cream[50], roughness: 0.5, clearcoat: 0.4 });
    case "ink":
      return phys({ color: "#1d1b1a", roughness: 0.35, clearcoat: 0.6 });
    case "metal":
      return phys({ color: "#d4d8de", metalness: 1, roughness: 0.28 });
    case "copper":
      return phys({ color: "#d58a52", metalness: 1, roughness: 0.32 });
    case "rubber":
      return phys({ color: "#2a2826", roughness: 0.85 });
    case "orange":
      return phys({ color: P.apricot[500], roughness: 0.45, clearcoat: 0.35 });
    case "volt":
      return phys({ color: P.volt[500], roughness: 0.35, clearcoat: 0.5 });
    case "glass":
      // Faked glass (real transmission is kept for one object, CLAUDE.md §9): thin, glossy, bright at its walls.
      return phys({ color: P.white, transparent: true, opacity: low ? 0.3 : 0.2, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.6, side: DoubleSide, depthWrite: false });
    case "film":
      // Zip-bag film: soft, milky plastic, not glass: more opaque and rougher, with a satin sheen on its crinkles and no mirror coat.
      return phys({ color: P.white, transparent: true, opacity: low ? 0.42 : 0.36, roughness: 0.38, clearcoat: 0.15, clearcoatRoughness: 0.5, sheen: 0.8, sheenColor: P.white, specularIntensity: 0.6, envMapIntensity: 0.9, side: DoubleSide, depthWrite: false });
    case "steel":
      // Brushed stainless: the scale's pan, terminals and contacts.
      return phys({ color: "#cfd2d6", metalness: 1, roughness: 0.34 });
    case "black":
      // Matte black ABS: battery holders, bezels, robotics trim.
      return phys({ color: LAB.robotics.trim, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4 });
    case "insulation":
      // Wire insulation: soft graphite with a satin sheen.
      return phys({ color: "#2b2c31", roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.25 });
    case "gold":
      return phys({ color: LAB.robotics.gold, roughness: 0.32, metalness: 0.25, clearcoat: 0.7 });
    case "sand":
      return phys({ color: LAB.chemistry.gold, roughness: 0.4, clearcoat: 0.5 });
    case "sage":
      return phys({ color: LAB.chemistry.sage, roughness: 0.55, clearcoat: 0.3 });
    case "teal":
      return phys({ color: LAB.robotics.teal, roughness: 0.35, clearcoat: 0.6 });
    case "satin":
      // Lab casework in a tint: a satin lacquer with a soft clearcoat (Chemistry's bench and hood).
      return phys({ color: tint, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.35 });
    case "matte":
      // Lab casework in a tint, matte (Robotics' white worktop and black trim).
      return phys({ color: tint, roughness: 0.62, clearcoat: 0.12, clearcoatRoughness: 0.5 });
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
