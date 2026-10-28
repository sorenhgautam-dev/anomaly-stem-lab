"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { scenes, scrollKit, SCRUB_MEDIA } from "@/lib/scroll";

/*
 * The labs section's scroll scene (pattern studied from Skiper's "Card stack
 * with gsap and rotate", our own code): on wide screens with full motion,
 * scrolling the section into view brings the four lab cards
 * ([data-labs-card]) rising and sliding into place in story order, landing
 * with a little overshoot, while their 3D cameras fly in to each bench
 * (LabObjectView reads scenes.labs). GSAP only scrubs; nothing is pinned.
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
      const cards = [...el.querySelectorAll("[data-labs-card]")];
      const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: el, start: "top 85%", end: "center 55%", scrub: 0.7, onUpdate: (st) => (scenes.labs = st.progress) } });
      // Rise and slide only (no rotation): each card's 3D is drawn in its box, which can't turn with the card.
      // Every card, in story order, from its own side.
      cards.forEach((card, i) => tl.fromTo(card, { yPercent: 45 + (i % 2) * 20, xPercent: i % 2 ? -12 : 12, scale: 0.92, opacity: 0 }, { yPercent: 0, xPercent: 0, scale: 1, opacity: 1, ease: "back.out(1.4)" }, i * 0.1));
      return () => {
        scenes.labs = 1;
      };
    });
    return () => mm.revert();
  }, []);
  return (
    <section ref={section} aria-labelledby={labelledBy}>
      {/* Four lab cards in two rows don't fit one pinned screen, so the cards rise in as the section scrolls past. */}
      <div className="flex flex-col justify-center [perspective:1400px]">{children}</div>
    </section>
  );
}
