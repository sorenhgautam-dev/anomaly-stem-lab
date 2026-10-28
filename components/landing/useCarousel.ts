"use client";

import { startTransition, useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { useReducedMotion } from "@/lib/motion";

/*
 * The hero carousel's behaviour (DESIGN.md §7.1): auto-advance every 7 s,
 * paused on hover or focus or by the pause button (WCAG 2.2.2), and never
 * with reduced motion; arrows and dots; swipe with a finger or a mouse drag.
 * It also waits while the carousel is off screen or the tab is hidden: the
 * slides differ in height on phones, and a slide change far above the
 * reader would shift the page under them.
 */

const SWIPE_PX = 50;

export function useCarousel(count: number, { interval = 7000, disabled = false } = {}) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const reduced = useReducedMotion();
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    if (!el) return;
    let seen = true;
    const update = () => setOnScreen(seen && document.visibilityState === "visible");
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      update();
    }, { threshold: 0.2 });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [el]);

  // Slide changes render as a transition: React spreads the hero's re-render over frames instead of one long click (it was ~110 ms).
  const go = useCallback((i: number) => startTransition(() => setIndex(((i % count) + count) % count)), [count]);
  const playing = !disabled && !userPaused && !hovered && !reduced && onScreen;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => startTransition(() => setIndex((i) => (i + 1) % count)), interval);
    return () => window.clearTimeout(id);
  }, [playing, index, count, interval]);

  const bind = {
    ref: setEl,
    onPointerEnter: (e: PointerEvent) => e.pointerType === "mouse" && setHovered(true),
    onPointerLeave: () => setHovered(false),
    onFocusCapture: () => setHovered(true),
    onBlurCapture: () => setHovered(false),
    onPointerDown: (e: PointerEvent) => {
      // Only drags that start on the slide itself, not on a button inside it.
      if ((e.target as Element).closest("button, a, input")) return;
      drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    },
    onPointerUp: (e: PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d || d.id !== e.pointerId || disabled) return;
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - d.y)) go(index + (dx < 0 ? 1 : -1));
    },
    onPointerCancel: () => (drag.current = null),
  };

  return { index, go, playing, paused: userPaused, setPaused: setUserPaused, bind };
}
