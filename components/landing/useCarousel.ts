"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { useReducedMotion } from "@/lib/motion";

/*
 * The hero carousel's behaviour (DESIGN.md §7.1): auto-advance every 7 s,
 * paused on hover or focus or by the pause button (WCAG 2.2.2), and never
 * with reduced motion; arrows and dots; swipe with a finger or a mouse drag.
 */

const SWIPE_PX = 50;

export function useCarousel(count: number, { interval = 7000, disabled = false } = {}) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const reduced = useReducedMotion();
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);
  const playing = !disabled && !userPaused && !hovered && !reduced;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), interval);
    return () => window.clearTimeout(id);
  }, [playing, index, count, interval]);

  const bind = {
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
