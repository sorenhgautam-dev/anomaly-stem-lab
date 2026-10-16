import { create } from "zustand";

/**
 * Render quality (CLAUDE.md §9). "low" turns off the lens cursor, chromatic
 * aberration and the reflective floor, and thins out objects and particles.
 */
export type Quality = "high" | "low";

interface QualityState {
  level: Quality;
  /** Set once FPS stayed under 45; stops the level bouncing back up. */
  autoDropped: boolean;
  /** Chosen by hand or by URL: never change it automatically. */
  locked: boolean;
  setLevel: (level: Quality, locked?: boolean) => void;
  dropToLow: () => void;
}

export const useQuality = create<QualityState>()((set) => ({
  level: "high",
  autoDropped: false,
  locked: false,
  setLevel: (level, locked = true) => set({ level, locked }),
  dropToLow: () => set((s) => (s.locked ? s : { level: "low", autoDropped: true })),
}));

/**
 * First guess before any FPS data: touch devices and small CPUs start low.
 * `?quality=high` or `?quality=low` in the URL forces a level and turns off
 * the automatic drop, e.g. for a demo on a known laptop.
 */
export function detectInitialQuality(): { level: Quality; locked: boolean } {
  const forced = new URLSearchParams(window.location.search).get("quality");
  if (forced === "high" || forced === "low") return { level: forced, locked: true };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  return { level: coarse || cores <= 4 ? "low" : "high", locked: false };
}
