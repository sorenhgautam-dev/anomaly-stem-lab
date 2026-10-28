"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { prefersReducedMotion } from "@/lib/motion";
import { scrollKit } from "@/lib/scroll";

/*
 * Smooth, weighted scrolling (DESIGN.md §9.1) with Lenis, plus smooth jumps
 * to in-page anchors. Headlines lean a touch with the scroll speed (--scroll-skew,
 * read by SplitHeadline), easing back to upright when the page stops.
 * Native scrolling with reduced motion or a touch screen.
 * Lenis runs on GSAP's ticker and feeds ScrollTrigger, so smooth scroll and
 * every scroll-driven scene share one loop (CLAUDE.md §9); neither depends
 * on the 3D canvas, so the page still scrolls if WebGL is unavailable.
 */
export function SmoothScroll() {
  useEffect(() => {
    const { gsap, ScrollTrigger } = scrollKit();
    if (prefersReducedMotion() || window.matchMedia("(pointer: coarse)").matches) return;
    const lenis = new Lenis({ autoRaf: false, lerp: 0.1, wheelMultiplier: 0.95, anchors: { offset: -16 } });
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    lenis.on("scroll", ScrollTrigger.update);
    const root = document.documentElement;
    let target = 0;
    let skew = 0;
    let raf = 0;
    const settle = () => {
      skew += (target - skew) * 0.14;
      target *= 0.88;
      root.style.setProperty("--scroll-skew", skew.toFixed(3));
      raf = Math.abs(skew) > 0.005 || Math.abs(target) > 0.005 ? requestAnimationFrame(settle) : 0;
    };
    lenis.on("scroll", ({ velocity }: { velocity: number }) => {
      target = Math.max(-2.5, Math.min(2.5, velocity * 0.1));
      if (!raf) raf = requestAnimationFrame(settle);
    });
    return () => {
      gsap.ticker.remove(tick);
      cancelAnimationFrame(raf);
      root.style.removeProperty("--scroll-skew");
      lenis.destroy();
    };
  }, []);
  return null;
}
