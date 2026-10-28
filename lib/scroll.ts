import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
 * Scroll-driven animation (DESIGN.md §9.1, CLAUDE.md §3.4): GSAP's
 * ScrollTrigger, fed by Lenis's smooth scroll on GSAP's one ticker
 * (components/ui/SmoothScroll.tsx). Register once, from the browser.
 *
 * `scenes` holds live scroll progress (0…1) for the 3D scenes that play with
 * the scroll; 3D views read it every frame, so no React state changes while
 * scrolling (CLAUDE.md §9). A scene that isn't on the page stays at 1, its
 * finished state.
 */

let registered = false;

export function scrollKit(): { gsap: typeof gsap; ScrollTrigger: typeof ScrollTrigger } {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return { gsap, ScrollTrigger };
}

export const scenes = { hero: 0, labs: 1 };

/** The page's smooth scroller while one runs (components/ui/SmoothScroll.tsx), so jumps go through it instead of fighting it. */
let smooth: { scrollTo: (target: number, options?: { duration?: number }) => void } | null = null;

export function setSmoothScroller(s: typeof smooth): void {
  smooth = s;
}

/** Glide the page to `top` (px from the top of the document): through Lenis when it runs, else natively (instantly with reduced motion). */
export function scrollPageTo(top: number): void {
  if (smooth) smooth.scrollTo(top, { duration: 0.9 });
  else window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

/** An element's top, in px from the top of the document (offsetTop is only relative to its positioned parent). */
export function pageTop(el: HTMLElement): number {
  return el.getBoundingClientRect().top + window.scrollY;
}

/** Wide screens with a fine pointer and full motion: where sections pin and scrub. */
export const SCRUB_MEDIA = "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
