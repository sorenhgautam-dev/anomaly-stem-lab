"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { animate, Spring, stopAnimating } from "@/lib/motion-loop";

/*
 * A pinned scroll scene (DESIGN.md §9.1 "sections pin and play short
 * scroll-driven scenes"): while the section scrolls past, its progress 0…1
 * is written to --p on the section, through a spring so scrubbing feels
 * heavy rather than glued to the wheel. `steps` splits the progress into
 * that many beats and reports the current one (React state changes only on
 * a new beat, never per frame).
 *
 * Only on wide screens with a fine pointer and full motion; elsewhere --p
 * stays at its CSS default (1, everything shown) and nothing pins.
 */
export function useScrollScene<T extends HTMLElement>(steps: number) {
  const ref = useRef<T>(null);
  const [step, setStep] = useState(0);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    let off = () => {};
    const start = () => {
      off();
      const on = mq.matches && !prefersReducedMotion();
      setPinned(on);
      if (!on) {
        el.style.removeProperty("--p");
        return;
      }
      const p = new Spring(0, 90, 19);
      let beat = -1;
      // The section's place on the page, measured on start and on resize (not on every scroll, which would force a layout).
      let top = 0;
      let travel = 0;
      const measure = () => {
        const r = el.getBoundingClientRect();
        top = r.top + window.scrollY;
        travel = r.height - window.innerHeight;
      };
      measure();
      const target = () => (travel > 0 ? Math.min(1, Math.max(0, (window.scrollY - top) / travel)) : 1);
      p.x = p.target = target();
      const tick = (dt: number) => {
        const moving = p.step(dt);
        el.style.setProperty("--p", p.x.toFixed(4));
        const b = Math.min(steps - 1, Math.max(0, Math.floor(p.x * steps)));
        if (b !== beat) {
          beat = b;
          setStep(b);
        }
        return moving;
      };
      const onScroll = () => {
        p.target = target();
        animate(tick);
      };
      // Measure again once the section has grown to its pinned height, and whenever the page reflows.
      const raf = requestAnimationFrame(() => {
        measure();
        p.x = p.target = target();
        tick(0);
      });
      const ro = new ResizeObserver(measure);
      ro.observe(document.body);
      window.addEventListener("scroll", onScroll, { passive: true });
      off = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener("scroll", onScroll);
        stopAnimating(tick);
      };
    };
    start();
    mq.addEventListener("change", start);
    return () => {
      off();
      mq.removeEventListener("change", start);
    };
  }, [steps]);

  return { ref, step, pinned };
}
