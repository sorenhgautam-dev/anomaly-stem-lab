"use client";

import { useLayoutEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/*
 * A readout that counts to its value (DESIGN.md §9.1 "numbers count up and
 * down smoothly"). The first number in the text ("130.00 g", "≈ 2 V") eases
 * from where it was to the new value, keeping its decimals and the words
 * around it. The visible copy is a node React never touches (written
 * directly, no React state per frame); screen readers get the real text.
 */

const NUMBER = /-?\d+(?:\.\d+)?/;
const MS = 650;

export function CountUp({ text, className }: { text: string; className?: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const from = useRef<number | null>(null);
  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const m = text.match(NUMBER);
    const to = m ? Number(m[0]) : 0;
    const start = from.current ?? 0;
    from.current = m ? to : from.current;
    if (!m || m.index === undefined || prefersReducedMotion() || start === to) {
      node.textContent = text;
      return;
    }
    const decimals = m[0].split(".")[1]?.length ?? 0;
    const head = text.slice(0, m.index);
    const tail = text.slice(m.index + m[0].length);
    node.textContent = `${head}${start.toFixed(decimals)}${tail}`;
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const k = Math.min(1, (now - t0) / MS);
      const e = 1 - (1 - k) ** 3;
      node.textContent = `${head}${(start + (to - start) * e).toFixed(decimals)}${tail}`;
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      node.textContent = text;
    };
  }, [text]);
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span ref={el} aria-hidden />
    </span>
  );
}
