import { create } from "zustand";

/**
 * Render quality tiers (DESIGN.md §9.2, CLAUDE.md §9):
 *   high    all effects, dpr up to 1.5
 *   medium  dpr 1, fewer particles, simpler glass
 *   low     dpr 0.75–1, no post-processing, ~70% fewer particles, baked
 *           lighting, simplified Ano materials, 2D fallbacks for heavy VFX
 * Picked at start from detect-gpu, then adjusted live: a tier down when frames
 * fall, back up when there's headroom (unless chosen by hand or URL).
 */
export type Quality = "high" | "medium" | "low";

const ORDER: Quality[] = ["low", "medium", "high"];

interface QualityState {
  level: Quality;
  /** Set once the tier was stepped down for slow frames. */
  autoDropped: boolean;
  /** Chosen by hand or by URL: never change it automatically. */
  locked: boolean;
  /** detect-gpu has run (the site canvas waits for it, to pick antialiasing). */
  detected: boolean;
  setLevel: (level: Quality, locked?: boolean) => void;
  /** One tier down (-1) or up (+1), unless locked. */
  step: (direction: -1 | 1) => void;
  /** LEGACY name used by the old landing and lab room. */
  dropToLow: () => void;
}

export const useQuality = create<QualityState>()((set) => ({
  level: "high",
  autoDropped: false,
  locked: false,
  detected: false,
  setLevel: (level, locked = true) => set({ level, locked }),
  step: (direction) =>
    set((s) => {
      if (s.locked) return s;
      const i = Math.min(ORDER.length - 1, Math.max(0, ORDER.indexOf(s.level) + direction));
      return { level: ORDER[i], autoDropped: s.autoDropped || direction < 0 };
    }),
  dropToLow: () => set((s) => (s.locked ? s : { level: "low", autoDropped: true })),
}));

function forcedQuality(): Quality | null {
  const forced = new URLSearchParams(window.location.search).get("quality");
  return forced === "high" || forced === "medium" || forced === "low" ? forced : null;
}

/** A quick first guess before any GPU data: touch devices and small CPUs start low. */
function heuristic(): Quality {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  return coarse || cores <= 4 ? "low" : "high";
}

/**
 * LEGACY synchronous guess for the old landing and lab room. `?quality=high`,
 * `medium` or `low` in the URL forces a tier and turns off live changes.
 */
export function detectInitialQuality(): { level: Quality; locked: boolean } {
  const forced = forcedQuality();
  return forced ? { level: forced, locked: true } : { level: heuristic(), locked: false };
}

let detecting: Promise<void> | null = null;

/**
 * Pick the starting tier with detect-gpu (benchmarks served from
 * /gpu-benchmarks, so nothing is fetched from a CDN). Runs once.
 */
export function detectQuality(): Promise<void> {
  detecting ??= (async () => {
    const forced = forcedQuality();
    if (forced) {
      useQuality.setState({ level: forced, locked: true, detected: true });
      return;
    }
    let level = heuristic();
    try {
      const { getGPUTier } = await import("detect-gpu");
      const gpu = await getGPUTier({ benchmarksURL: "/gpu-benchmarks" });
      level = gpu.tier >= 3 ? "high" : gpu.tier === 2 ? (gpu.isMobile ? "low" : "medium") : "low";
    } catch {
      // Keep the heuristic guess.
    }
    if (!useQuality.getState().locked) useQuality.setState({ level });
    useQuality.setState({ detected: true });
  })();
  return detecting;
}

/** Device pixel ratio cap per tier (CLAUDE.md §9: never above 1.5). */
export function maxDprFor(level: Quality): number {
  const device = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return level === "high" ? Math.min(device, 1.5) : level === "medium" ? 1 : Math.min(device, 0.85);
}

/** Particle count multiplier per tier (low ≈ 70% fewer). */
export function particleScale(level: Quality): number {
  return level === "high" ? 1 : level === "medium" ? 0.6 : 0.3;
}
