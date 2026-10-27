"use client";

import { useEffect, type RefObject } from "react";

/*
 * When the site canvas should draw (DESIGN.md §9.2 "render only when
 * needed"): only while the tab is visible, at least one 3D view is on
 * screen, and nothing has frozen it (the ANOMALY beat). SiteCanvas applies
 * the result to R3F's frame loop; when it stops because no view is left on
 * screen it clears the canvas, so no stale picture stays behind.
 */

type Mode = "always" | "never";

const state = { hidden: false, visibleViews: 0, frozenUntil: 0 };
const listeners = new Set<(mode: Mode, clear: boolean) => void>();
let timer = 0;

function mode(): Mode {
  return !state.hidden && state.visibleViews > 0 && performance.now() >= state.frozenUntil ? "always" : "never";
}

function notify() {
  const m = mode();
  const clear = state.visibleViews === 0;
  listeners.forEach((cb) => cb(m, clear));
}

/** SiteCanvas listens here. Returns an unsubscribe. */
export function onFrameloop(cb: (mode: Mode, clear: boolean) => void): () => void {
  listeners.add(cb);
  cb(mode(), state.visibleViews === 0);
  return () => listeners.delete(cb);
}

export function setTabHidden(hidden: boolean): void {
  state.hidden = hidden;
  notify();
}

/** Hold the current frame for `ms` (the scene "freezes"); drawing resumes after. */
export function freezeFor(ms: number): () => void {
  state.frozenUntil = performance.now() + ms;
  notify();
  window.clearTimeout(timer);
  timer = window.setTimeout(notify, ms + 5);
  return () => {
    state.frozenUntil = 0;
    window.clearTimeout(timer);
    notify();
  };
}

/** Counts a 3D view's tracking element while it's on screen. */
export function useViewPresence(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let counted = false;
    const set = (on: boolean) => {
      if (on === counted) return;
      counted = on;
      state.visibleViews += on ? 1 : -1;
      notify();
    };
    const io = new IntersectionObserver(([entry]) => set(entry.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => {
      io.disconnect();
      set(false);
    };
  }, [ref]);
}
