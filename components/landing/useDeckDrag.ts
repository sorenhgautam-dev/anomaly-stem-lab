"use client";

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { animate, Spring, stopAnimating } from "@/lib/motion-loop";

/*
 * Drag and fling for the front card of a deck (pattern studied on Skiper's
 * card swipe carousel and Aceternity's draggable card; our own code). The
 * card follows the pointer, leaning a little as it goes. Let go past about
 * 140 px, or flick it (a quick throw of 30 px or more), and it flies off
 * that side on a spring before `onThrow` sends it to the back. Anything
 * less springs home. Values go straight to the element's own translate and
 * rotate, so the stack's transform underneath stays untouched.
 */

const THROW_PX = 140;
const FLICK_MS = 300;
const FLICK_PX = 30;

export function useDeckDrag(onThrow: (dir: 1 | -1) => void) {
  const card = useRef<HTMLElement | null>(null);
  const x = useRef(new Spring(0, 260, 24));
  const drag = useRef<{ id: number; startX: number; startT: number; moved: boolean } | null>(null);
  const thrown = useRef<1 | -1 | 0>(0);

  const write = useCallback(() => {
    const el = card.current;
    if (!el) return;
    el.style.translate = `${x.current.x.toFixed(1)}px ${(Math.abs(x.current.x) * -0.06).toFixed(1)}px`;
    el.style.rotate = `${(x.current.x * 0.07).toFixed(2)}deg`;
  }, []);

  const tick = useCallback(
    (dt: number) => {
      const moving = x.current.step(dt);
      write();
      const width = card.current?.offsetWidth ?? 400;
      if (thrown.current && Math.abs(x.current.x) > width * 1.15) {
        const dir = thrown.current;
        thrown.current = 0;
        x.current.x = x.current.target = 0;
        x.current.v = 0;
        // The card goes to the back: hide it, clear its own offset, then let the
        // stack fade it in at the back (no flash back through the middle).
        const el = card.current;
        if (el) {
          el.style.transition = "none";
          el.style.opacity = "0";
          el.style.translate = "";
          el.style.rotate = "";
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              el.style.transition = "";
              el.style.opacity = "";
            }),
          );
        }
        onThrow(dir);
        return false;
      }
      return moving || Boolean(thrown.current);
    },
    [onThrow, write],
  );

  useEffect(() => () => stopAnimating(tick), [tick]);

  /** Send the front card away to one side (also used by the arrows and keys). */
  const fling = useCallback(
    (dir: 1 | -1) => {
      if (thrown.current) return;
      if (prefersReducedMotion() || !card.current) {
        onThrow(dir);
        return;
      }
      thrown.current = dir;
      x.current.target = dir * (card.current.offsetWidth * 1.6);
      x.current.v = dir * 900;
      animate(tick);
    },
    [onThrow, tick],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    // The corner arrow is a link of its own: let it be clicked.
    if ((e.target as HTMLElement).closest("a, button") || thrown.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    stopAnimating(tick);
    drag.current = { id: e.pointerId, startX: e.clientX - x.current.x, startT: performance.now(), moved: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    x.current.x = x.current.target = e.clientX - d.startX;
    d.moved ||= Math.abs(x.current.x) > 4;
    write();
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const dx = x.current.x;
    const quick = performance.now() - d.startT < FLICK_MS && Math.abs(dx) >= FLICK_PX;
    if (Math.abs(dx) >= THROW_PX || quick) {
      fling(dx > 0 ? 1 : -1);
      return;
    }
    x.current.target = 0;
    animate(tick);
  };

  return { card, fling, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
