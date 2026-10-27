"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";

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

/**
 * Magnetic pull: the inner element leans toward the pointer while it's over
 * the host. Only the inner content moves; the host (the hit area) never does
 * (CLAUDE.md §10.1).
 */
export function useMagnetic(host: RefObject<HTMLElement | null>, inner: RefObject<HTMLElement | null>, strength = 6): void {
  useEffect(() => {
    const el = host.current;
    const target = inner.current;
    if (!el || !target || prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      target.style.transform = `translate3d(${x * strength}px, ${y * strength * 0.6}px, 0)`;
    };
    const leave = () => {
      target.style.transform = "";
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [host, inner, strength]);
}

/**
 * Tilt toward the cursor on hover (cards, DESIGN.md §9.1). The tilted element
 * is inside the hit area, so clicks land where the card is drawn.
 */
export function useTilt(host: RefObject<HTMLElement | null>, inner: RefObject<HTMLElement | null>, degrees = 6): void {
  useEffect(() => {
    const el = host.current;
    const target = inner.current;
    if (!el || !target || prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      target.style.transform = `perspective(900px) rotateX(${-y * degrees}deg) rotateY(${x * degrees}deg)`;
    };
    const leave = () => {
      target.style.transform = "";
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [host, inner, degrees]);
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
 * (DESIGN.md §9.1). Eased toward the pointer each frame; stops when settled.
 */
export function useParallax(ref: RefObject<HTMLElement | null>, depth: number): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.05 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2 * depth;
      ty = (e.clientY / window.innerHeight - 0.5) * 2 * depth;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, [ref, depth]);
}
