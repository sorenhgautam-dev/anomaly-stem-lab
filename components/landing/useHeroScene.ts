"use client";

import { useEffect, type RefObject } from "react";
import { scenes, scrollKit, SCRUB_MEDIA } from "@/lib/scroll";

/*
 * The hero's scroll scene (pattern studied from Aceternity's "Container
 * Scroll Animation", our own code): as the hero scrolls away, the camera
 * dollies into the stage (HeroStage reads scenes.hero) while Ano drifts
 * aside, the stage card grows, the headline lifts and settles back a little
 * and the two cards slide out to the sides. It scrubs without pinning: a
 * sticky or pinned hero becomes its own stacking context and would put its
 * cards under the 3D canvas (How it works and the labs, which pin, have no
 * cards over their 3D). Wide screens with full motion only.
 */

export function useHeroScene(wrapper: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const { gsap } = scrollKit();
    const mm = gsap.matchMedia();
    mm.add(SCRUB_MEDIA, () => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "bottom 25%",
          scrub: 0.7,
          onUpdate: (s) => {
            scenes.hero = s.progress;
          },
        },
      });
      tl.to(el.querySelectorAll("h1, [data-hero-overlay]"), { yPercent: -30, scale: 0.94, transformOrigin: "50% 0%" }, 0)
        .to(el.querySelectorAll("[data-hero-card='result']"), { xPercent: -140, rotate: -8 }, 0)
        .to(el.querySelectorAll("[data-hero-card='belief']"), { xPercent: 140, rotate: 8 }, 0)
        .to(el.querySelectorAll("[data-hero-stage]"), { scale: 1.1, transformOrigin: "50% 100%" }, 0)
        .to(el.querySelectorAll("[data-hero-lower]"), { y: 80 }, 0);
      return () => {
        scenes.hero = 0;
      };
    });
    return () => mm.revert();
  }, [wrapper]);
}
