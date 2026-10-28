"use client";

import { Fragment, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { scrollKit } from "@/lib/scroll";

/*
 * A headline that reveals word by word as it scrolls in (pattern studied
 * from Skiper's "Text Scroll animation", our own code): each word rises out
 * of a slight tilt and from faint to full ink. It plays once, to the end,
 * when the headline comes into view: a scrubbed reveal could stop part-way
 * (inside a pinned section, or when the reader stops scrolling) and leave
 * words low and clipped. Reduced motion: the words simply sit there.
 */

export function ScrollWords({ text, as: Tag = "h2", id, className }: { text: string; as?: "h2" | "h3"; id?: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { gsap } = scrollKit();
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        el.querySelectorAll("[data-word]"),
        { opacity: 0.12, yPercent: 38, rotate: 5 },
        { opacity: 1, yPercent: 0, rotate: 0, duration: 0.7, ease: "back.out(1.6)", stagger: 0.09, scrollTrigger: { trigger: el, start: "top 88%", once: true } },
      );
    });
    return () => mm.revert();
  }, [text]);
  const words = text.split(" ");
  return (
    <Tag ref={ref} id={id} aria-label={text} className={cn("text-balance [transform:skewY(calc(var(--scroll-skew,0)*1deg))]", className)}>
      <span aria-hidden>
        {words.map((w, i) => (
          // The space sits between the word boxes (inside an inline-block a trailing space is dropped).
          <Fragment key={i}>
            <span data-word className="inline-block origin-bottom-left will-change-transform">
              {w}
            </span>
            {i < words.length - 1 && " "}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
