"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { scrollKit } from "@/lib/scroll";

/*
 * A number that counts up when it scrolls into view (pattern studied from
 * Skiper's "Animated number", our own code), easing out and landing with a
 * small spring. Server-rendered at its real value, so the page is right
 * before any script runs; reduced motion leaves it there.
 */

/** A number as shown: fixed decimals, zero-padded to `pad` characters. */
const format = (n: number, digits: number, pad: number) => n.toFixed(digits).padStart(pad, "0");

export function ScrollCount({ value, digits = 0, pad = 0, className }: { value: number; digits?: number; pad?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { gsap } = scrollKit();
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const n = { v: 0 };
      el.textContent = format(0, digits, pad);
      gsap.to(n, {
        v: value,
        duration: 1.1,
        ease: "power3.out",
        onUpdate: () => {
          el.textContent = format(n.v, digits, pad);
        },
        onComplete: () => {
          gsap.fromTo(el, { scale: 1.18 }, { scale: 1, duration: 0.5, ease: "back.out(3)" });
        },
        // As soon as any of it shows, so a 0 is never left standing at the screen's edge.
        scrollTrigger: { trigger: el, start: "top bottom", once: true },
      });
    });
    return () => mm.revert();
  }, [value, digits, pad]);
  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)}>
      {format(value, digits, pad)}
    </span>
  );
}
