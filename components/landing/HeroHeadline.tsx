"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { scrollKit } from "@/lib/scroll";

/*
 * The hero's giant headline, readable where it crosses a dark stage card
 * (graphite or teal): an identical white copy sits over the ink one, clipped
 * to the card's rounded box, so each letter turns white exactly where it
 * overlaps the card and stays ink on the paper. The clip follows the card
 * and the headline through resizes and the hero's scroll scene (which moves
 * the copy with the headline, useHeroScene).
 */

type Props = Omit<ComponentProps<typeof SplitHeadline>, "as" | "className"> & { dark: boolean };

/** The stage card's corner radius (StageCard: rounded-[2.75rem]). */
const CARD_RADIUS = 44;

export function HeroHeadline({ dark, ...props }: Props) {
  const overlay = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const o = overlay.current;
    if (!dark || !o) return;
    const place = () => {
      const card = [...document.querySelectorAll<HTMLElement>("[data-stage-card]")].find((el) => el.getClientRects().length > 0)?.getBoundingClientRect();
      const r = o.getBoundingClientRect();
      if (!card || r.width === 0) return;
      // In the copy's own (untransformed) pixels: the scroll scene scales it.
      const k = o.offsetWidth / r.width;
      const top = Math.max(0, (card.top - r.top) * k);
      const left = Math.max(0, (card.left - r.left) * k);
      const right = Math.max(0, (r.right - card.right) * k);
      const bottom = Math.max(0, (r.bottom - card.bottom) * k);
      o.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px round ${CARD_RADIUS * k}px)`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(o);
    // While the hero's scroll scene plays, follow it once per frame, after GSAP has moved things (never per scroll event: that forces extra layouts).
    const { gsap } = scrollKit();
    let lastY = -1;
    const follow = () => {
      const y = window.scrollY;
      if (y === lastY || y > window.innerHeight * 1.2) return;
      lastY = y;
      place();
    };
    gsap.ticker.add(follow);
    return () => {
      ro.disconnect();
      gsap.ticker.remove(follow);
    };
  }, [dark]);
  return (
    <div className="relative z-15 order-1">
      <SplitHeadline {...props} className="relative" />
      {dark && (
        <div ref={overlay} aria-hidden data-hero-overlay className="pointer-events-none absolute inset-0 hidden [clip-path:inset(100%)] md:block">
          <SplitHeadline {...props} as="h2" className="text-white" />
        </div>
      )}
    </div>
  );
}
