import { useQuality } from "@/lib/quality";
import type { FxWorld } from "./world";

/*
 * Which FxWorld the effects draw into (bound by components/fx/FxLayer.tsx)
 * and the user's motion preference. Effects are ignored until it mounts.
 */

export interface Point2 {
  x: number;
  y: number;
}

export const fxState = { world: null as FxWorld | null, reduced: false };

export function bindFx(next: FxWorld, prefersReducedMotion: boolean): () => void {
  fxState.world = next;
  fxState.reduced = prefersReducedMotion;
  return () => {
    if (fxState.world === next) fxState.world = null;
  };
}

/** Centre of an element's box, in screen pixels. */
export function centreOf(el: Element | null | undefined): Point2 | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Low quality halves particle counts. */
export function lowQuality(): boolean {
  return useQuality.getState().level === "low";
}

export const count = (n: number) => Math.max(1, Math.round(n * (lowQuality() ? 0.5 : 1)));
