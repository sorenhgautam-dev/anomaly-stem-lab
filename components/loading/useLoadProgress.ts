"use client";

import { useEffect, type RefObject } from "react";
import { onCanvasReady } from "@/components/three/boot";
import { useQuality } from "@/lib/quality";
import { prefersReducedMotion } from "@/lib/motion";

/*
 * Drives a loading screen (DESIGN.md §7.8) without React state per frame:
 * eases a progress value toward the real loading work and writes it into
 * the DOM as the percentage text and the CSS variables AnoParts reads.
 *  - "boot": the first load. Four real signals (fonts, GPU tier, the site
 *    canvas's first frame, the window load event) each count a quarter; a
 *    slow time creep keeps it moving, and it finishes by 3.2 s whatever.
 *  - "route": a page segment streaming in; no real signal, so it creeps
 *    toward 90 % until the page replaces it.
 */

const PARTS: [string, number, number][] = [
  ["--k-antenna", 0.0, 0.3],
  ["--k-head", 0.12, 0.55],
  ["--k-body", 0.32, 0.72],
  ["--k-arm-l", 0.55, 0.88],
  ["--k-arm-r", 0.62, 0.95],
];
const MAX_BOOT_S = 3.2;

const seg = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));

export function useLoadProgress(root: RefObject<HTMLElement | null>, mode: "boot" | "route", onDone?: () => void): void {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const percent = el.querySelector<HTMLElement>("[data-percent]");
    const done = { fonts: false, gpu: false, canvas: false, load: false };
    const offs: (() => void)[] = [];
    if (mode === "boot") {
      void document.fonts?.ready.then(() => (done.fonts = true));
      const gpu = () => (done.gpu = useQuality.getState().detected || done.gpu);
      gpu();
      offs.push(useQuality.subscribe(gpu));
      offs.push(onCanvasReady(() => (done.canvas = true)));
      if (document.readyState === "complete") done.load = true;
      else {
        const load = () => (done.load = true);
        window.addEventListener("load", load, { once: true });
        offs.push(() => window.removeEventListener("load", load));
      }
    }
    const still = prefersReducedMotion();
    const start = performance.now();
    let last = start;
    let p = 0;
    let shown = -1;
    let raf = 0;
    let finished = false;
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let target: number;
      if (mode === "boot") {
        const real = (Number(done.fonts) + Number(done.gpu) + Number(done.canvas) + Number(done.load)) / 4;
        target = t > MAX_BOOT_S ? 1 : Math.max(real, Math.min(0.85, (t / 2.4) * 0.85));
      } else target = 0.9 * (1 - Math.exp(-t / 1.4));
      p += (target - p) * (1 - Math.exp(-dt * (target === 1 ? 7 : 4)));
      if (target === 1 && p > 0.995) p = 1;
      const whole = Math.round(p * 100);
      if (whole !== shown) {
        shown = whole;
        if (percent) percent.textContent = `${whole}%`;
        el.setAttribute("aria-valuenow", String(whole));
      }
      for (const [name, a, b] of PARTS) el.style.setProperty(name, String(still ? 1 : seg(p, a, b)));
      if (p === 1 && !finished) {
        finished = true;
        onDone?.();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      offs.forEach((off) => off());
    };
  }, [root, mode, onDone]);
}
