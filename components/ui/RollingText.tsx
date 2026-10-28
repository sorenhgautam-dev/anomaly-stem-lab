"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/motion";

/*
 * Headline type that rolls into place (DESIGN.md §9, §9.1): each word rises
 * from its own mask and its letters settle one after another with a small
 * overshoot. `ramp` colours the letters along a two-stop gradient (a CSS
 * gradient can't be clipped to letters that each move).
 *
 * `when="view"` waits until the text scrolls into view. The server renders
 * the letters still and visible; only once mounted, and only if the text is
 * still below the fold, are they tucked into their masks to wait. So nothing
 * stays hidden if scripts never run, and reduced motion shows plain text.
 */

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function RollingLetters({ text, delay = 0, step = 28, ramp, from = 0, total = text.length }: { text: string; delay?: number; step?: number; ramp?: readonly [string, string] | null; from?: number; total?: number }) {
  return (
    <>
      {text.split(/(\s+)/).map((word, w, words) => {
        if (/^\s+$/.test(word)) return <span key={w}>{word}</span>;
        const start = words.slice(0, w).join("").length;
        return (
          <span key={w} className="inline-block overflow-hidden whitespace-nowrap pb-[0.06em] align-bottom">
            {Array.from(word).map((ch, i) => {
              const k = total > 1 ? (from + start + i) / (total - 1) : 0;
              const style: CSSProperties & Record<"--roll-delay", string> = {
                "--roll-delay": `${delay + (start + i) * step}ms`,
                color: ramp ? `color-mix(in oklab, ${ramp[0]} ${Math.round((1 - k) * 100)}%, ${ramp[1]})` : undefined,
              };
              return (
                <span key={i} data-roll-letter className="inline-block whitespace-pre" style={style}>
                  {ch}
                </span>
              );
            })}
          </span>
        );
      })}
    </>
  );
}

/** Arms a heading so its letters roll in when it first scrolls into view. */
export function useRollOnView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
      el.dataset.roll = "go";
      return;
    }
    el.dataset.roll = "wait";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.roll = "go";
        io.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** A heading whose words roll in when it scrolls into view. */
export function RollingHeading({ text, as: Tag = "h2", id, className }: { text: string; as?: "h2" | "h3"; id?: string; className?: string }) {
  const ref = useRollOnView<HTMLHeadingElement>();
  return (
    <Tag ref={ref} id={id} aria-label={text} className={cn("text-balance [transform:skewY(calc(var(--scroll-skew,0)*1deg))]", className)}>
      <span aria-hidden>
        <RollingLetters text={text} />
      </span>
    </Tag>
  );
}
