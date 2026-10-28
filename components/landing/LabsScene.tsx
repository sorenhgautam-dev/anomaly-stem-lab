"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { scenes, scrollKit, SCRUB_MEDIA } from "@/lib/scroll";

/*
 * The labs section's scroll scene (pattern studied from Skiper's "Card stack
 * with gsap and rotate", our own code): on wide screens with full motion the
 * section is a taller room with its content sticky inside, and scrolling
 * through it brings the two lab cards ([data-labs-card]) rising and sliding
 * into place, landing with a little overshoot, while their 3D cameras fly in
 * to each bench (LabObjectView reads scenes.labs). CSS sticky pins; GSAP
 * only scrubs.
 */

export function LabsScene({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const { gsap } = scrollKit();
    const mm = gsap.matchMedia();
    mm.add(SCRUB_MEDIA, () => {
      scenes.labs = 0;
      const cards = el.querySelectorAll("[data-labs-card]");
      gsap
        .timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: el, start: "top 85%", end: "bottom bottom", scrub: 0.7, onUpdate: (st) => (scenes.labs = st.progress) } })
        // Rise and slide only (no rotation): each card's 3D is drawn in its box, which can't turn with the card.
        .fromTo(cards[0], { yPercent: 55, xPercent: 14, scale: 0.9, opacity: 0 }, { yPercent: 0, xPercent: 0, scale: 1, opacity: 1, ease: "back.out(1.4)" }, 0)
        .fromTo(cards[1], { yPercent: 75, xPercent: -14, scale: 0.9, opacity: 0 }, { yPercent: 0, xPercent: 0, scale: 1, opacity: 1, ease: "back.out(1.4)" }, 0.12);
      return () => {
        scenes.labs = 1;
      };
    });
    return () => mm.revert();
  }, []);
  return (
    <section ref={section} aria-labelledby={labelledBy} className="motion-safe:pointer-fine:lg:h-[135dvh]">
      <div className="flex flex-col justify-center [perspective:1400px] motion-safe:pointer-fine:lg:sticky motion-safe:pointer-fine:lg:top-0 motion-safe:pointer-fine:lg:min-h-dvh">{children}</div>
    </section>
  );
}
