import { CanvasTexture, Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, SpriteMaterial, type Material, type Texture } from "three";
import type { Quality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";

/*
 * Shared materials for the 3D apparatus kit (DESIGN.md §8): glossy white
 * plastic, matte orange, ink, metal, faked glass (real transmission is kept
 * for one object per screen, CLAUDE.md §9) and translucent liquids. Built
 * once per tier; Low swaps physical materials for standard ones.
 */

type Kind = "plastic" | "clay" | "ink" | "metal" | "copper" | "glass" | "rubber" | "orange" | "volt" | "board";

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
      return phys({ color: tint, roughness: 0.75, clearcoat: 0.15, sheen: 0.4, sheenColor: P.apricot[100] });
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
      return phys({ color: P.white, transparent: true, opacity: low ? 0.3 : 0.22, roughness: 0.04, clearcoat: 1, iridescence: 0.4, side: DoubleSide, depthWrite: false });
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
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.75)");
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
