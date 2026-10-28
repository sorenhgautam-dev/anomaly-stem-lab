"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";
import { animate, domPointer, onPointerMove, Spring, stepAll, stopAnimating } from "./motion-loop";

/*
 * Motion helpers shared by the UI (DESIGN.md §9, §9.1). Everything here
 * writes transforms straight to the DOM from pointer events, never React
 * state per frame (CLAUDE.md §9), and does nothing with reduced motion.
 */

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void): () => void {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True when the OS asks for less motion. False on the server and first render (no hydration mismatch). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(REDUCED).matches;
}

/** Fine pointer and full motion: the only case where hover springs run. */
function canHover(): boolean {
  return !prefersReducedMotion() && window.matchMedia("(pointer: fine)").matches;
}

/**
 * Magnetic pull: the inner element leans toward the pointer while it's over
 * the host, and springs back with a little overshoot when it leaves. Only the
 * inner content moves; the host (the hit area) never does (CLAUDE.md §10.1).
 */
export function useMagnetic(host: RefObject<HTMLElement | null>, inner: RefObject<HTMLElement | null>, strength = 6): void {
  useEffect(() => {
    const el = host.current;
    const target = inner.current;
    if (!el || !target || !canHover()) return;
    const x = new Spring(0, 220, 16);
    const y = new Spring(0, 220, 16);
    const tick = (dt: number) => {
      const moving = stepAll(dt, x, y);
      target.style.translate = `${x.x.toFixed(2)}px ${y.x.toFixed(2)}px`;
      return moving;
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x.target = ((e.clientX - r.left) / r.width - 0.5) * 2 * strength;
      y.target = ((e.clientY - r.top) / r.height - 0.5) * 2 * strength * 0.6;
      animate(tick);
    };
    const leave = () => {
      x.target = 0;
      y.target = 0;
      animate(tick);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      stopAnimating(tick);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [host, inner, strength]);
}

/**
 * Cards tilt toward the cursor, lift with a deeper shadow and press down on
 * click (DESIGN.md §9.1), all on springs, so they settle with weight instead
 * of snapping. The moving element is inside the hit area, so clicks land
 * where the card is drawn. Sets --tilt-x, --tilt-y (0–100 %) and --tilt-lift
 * (0–1) for a `tilt-glare` highlight that follows the cursor. A card that
 * is itself the link must keep its drawn box within 2 px of its hit area
 * (G7), so give link cards a `lift` of about 1 and let the shadow lift them.
 */
export function useTilt(host: RefObject<HTMLElement | null>, inner: RefObject<HTMLElement | null>, degrees = 6, lift = 6): void {
  useEffect(() => {
    const el = host.current;
    const target = inner.current;
    if (!el || !target || !canHover()) return;
    const rx = new Spring(0, 150, 14);
    const ry = new Spring(0, 150, 14);
    const up = new Spring(0, 200, 18);
    const press = new Spring(0, 420, 24);
    let gx = 50;
    let gy = 30;
    const tick = (dt: number) => {
      const moving = stepAll(dt, rx, ry, up, press);
      const y = -up.x * lift + press.x * lift * 0.5;
      const scale = 1 + up.x * lift * 0.002 - press.x * 0.022;
      target.style.transform = `perspective(1000px) translate3d(0, ${y.toFixed(2)}px, 0) rotateX(${rx.x.toFixed(3)}deg) rotateY(${ry.x.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
      target.style.setProperty("--tilt-x", `${gx.toFixed(1)}%`);
      target.style.setProperty("--tilt-y", `${gy.toFixed(1)}%`);
      target.style.setProperty("--tilt-lift", up.x.toFixed(3));
      return moving;
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      rx.target = -(py - 0.5) * degrees;
      ry.target = (px - 0.5) * degrees;
      up.target = 1;
      gx = px * 100;
      gy = py * 100;
      animate(tick);
    };
    const leave = () => {
      rx.target = 0;
      ry.target = 0;
      up.target = 0;
      press.target = 0;
      animate(tick);
    };
    const down = () => {
      press.target = 1;
      animate(tick);
    };
    const release = () => {
      press.target = 0;
      animate(tick);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    return () => {
      stopAnimating(tick);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", release);
      el.removeEventListener("pointercancel", release);
    };
  }, [host, inner, degrees, lift]);
}

/** A soft ripple from where a press was released (buttons, DESIGN.md §9.1). */
export function ripple(el: HTMLElement, clientX: number, clientY: number, color: string): void {
  if (prefersReducedMotion()) return;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2.2;
  const dot = document.createElement("span");
  dot.setAttribute("aria-hidden", "true");
  dot.className = "pointer-events-none absolute rounded-full";
  Object.assign(dot.style, {
    left: `${clientX - r.left - size / 2}px`,
    top: `${clientY - r.top - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    background: color,
  });
  el.appendChild(dot);
  dot
    .animate(
      [
        { transform: "scale(0)", opacity: 0.35 },
        { transform: "scale(1)", opacity: 0 },
      ],
      { duration: 620, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    )
    .finished.finally(() => dot.remove());
}

/**
 * Mouse parallax: the element drifts with the pointer by `depth` px at the
 * screen edge, so cards at different depths move different amounts
 * (DESIGN.md §9.1). One shared pointer listener and frame loop for every
 * card (lib/motion-loop.ts); each card's drift is a soft spring.
 */
export function useParallax(ref: RefObject<HTMLElement | null>, depth: number): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !canHover()) return;
    const x = new Spring(0, 40, 11);
    const y = new Spring(0, 40, 11);
    const tick = (dt: number) => {
      const moving = stepAll(dt, x, y);
      el.style.translate = `${x.x.toFixed(2)}px ${y.x.toFixed(2)}px`;
      return moving;
    };
    const off = onPointerMove(() => {
      x.target = domPointer.nx * depth;
      y.target = domPointer.ny * depth;
      animate(tick);
    });
    return () => {
      off();
      stopAnimating(tick);
    };
  }, [ref, depth]);
}
