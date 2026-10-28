"use client";

import { useEffect, useRef } from "react";
import { bindFx } from "@/lib/fx";
import { drawWorld } from "@/lib/fx/draw";
import { Bounds, FxWorld } from "@/lib/fx/world";
import { warmAudio } from "@/lib/sound";
import { SoftCursor } from "./cursor";

/*
 * One full-screen canvas above everything for the soft cursor and the
 * VFX (DESIGN.md §8, §9.1). It draws in screen pixels, clears only the box it
 * drew last frame, and its frame loop sleeps whenever nothing moves.
 */

/** Things the cursor treats as clickable (the ring opens). */
const CLICKABLE = 'a[href], button:not(:disabled), [role="button"], [role="radio"], [role="tab"], summary, label, select, input[type="range"], [data-cursor="hover"]';
/** Text fields keep the system I-beam; modal dialogs keep the system cursor. */
const NATIVE = 'input:not([type="range"], [type="checkbox"], [type="radio"], [type="button"], [type="submit"]), textarea, [contenteditable="true"], dialog[open]';

export function FxLayer() {
  const ref = useRef<HTMLCanvasElement>(null);

  // The sound engine's audio context is made in idle time, so the first click doesn't pay for it.
  useEffect(() => warmAudio(), []);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const world = new FxWorld();
    const cursor = fine && !reduced ? new SoftCursor(world) : null;
    const unbind = bindFx(world, reduced);
    const root = document.documentElement;
    if (cursor) root.dataset.fxCursor = "";

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    let raf = 0;
    let last = 0;
    const drawn = new Bounds();
    const frame = (now: number) => {
      const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
      last = now;
      world.step(dt);
      const moving = cursor ? cursor.step(dt) : false;
      if (!drawn.empty) ctx.clearRect(drawn.x0, drawn.y0, drawn.x1 - drawn.x0, drawn.y1 - drawn.y0);
      drawn.reset();
      drawWorld(ctx, world, drawn);
      cursor?.draw(ctx, drawn);
      // Sleep when idle; the next pointer move or effect wakes the loop.
      if (moving || world.alive) raf = requestAnimationFrame(frame);
      else raf = 0;
    };
    const wake = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    world.onWake = wake;

    const onMove = (e: PointerEvent) => {
      if (!cursor) return;
      if (e.pointerType !== "mouse") {
        cursor.shown = false;
        wake();
        return;
      }
      const target = e.target instanceof Element ? e.target : null;
      cursor.shown = !target?.closest(NATIVE);
      cursor.hovering = !!target?.closest(CLICKABLE);
      cursor.move(e.clientX, e.clientY);
      wake();
    };
    const onDown = (e: PointerEvent) => {
      if (!cursor || e.pointerType !== "mouse") return;
      cursor.pressed = true;
      wake();
    };
    const onUp = (e: PointerEvent) => {
      if (!cursor || e.pointerType !== "mouse" || !cursor.pressed) return;
      cursor.pressed = false;
      if (cursor.shown) cursor.release();
      wake();
    };
    const onLeave = (e: PointerEvent) => {
      if (!cursor || e.relatedTarget) return;
      cursor.shown = false;
      wake();
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerout", onLeave, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      unbind();
      delete root.dataset.fxCursor;
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerout", onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-70 size-full [view-transition-name:fx-layer]" />;
}
