"use client";

import { useEffect, useRef } from "react";
import { scrollKit } from "@/lib/scroll";

/*
 * A gold circuit trace down the landing's black and gold stretch (patterns
 * studied from Skiper's "Svg follow scroll" and Aceternity's "Timeline", our
 * own code): a thin rail with solder pads beside each section, filling with
 * gold as you scroll and carrying a pulse of current at its tip. Each pad
 * lights as the current reaches it. Wide screens only; with reduced motion
 * it is drawn in full.
 */

/** Where the pads sit down the rail (share of its height), each with a short trace out to the right. */
const PADS = [0.04, 0.4, 0.74];

export function NightTrace() {
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const { gsap, ScrollTrigger } = scrollKit();
    const mm = gsap.matchMedia();
    const pads = [...el.querySelectorAll<HTMLElement>("[data-pad]")];
    const set = (p: number) => {
      el.style.setProperty("--trace", p.toFixed(4));
      pads.forEach((pad, i) => pad.toggleAttribute("data-lit", p >= PADS[i] - 0.005));
    };
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      set(0);
      const st = ScrollTrigger.create({ trigger: el.parentElement, start: "top 65%", end: "bottom 70%", scrub: 0.4, onUpdate: (s) => set(s.progress) });
      return () => st.kill();
    });
    mm.add("(prefers-reduced-motion: reduce)", () => set(1));
    return () => mm.revert();
  }, []);
  return (
    <div ref={rail} aria-hidden className="pointer-events-none absolute bottom-24 left-5 top-24 hidden w-6 [--trace:1] xl:block">
      {/* The rail, and the gold filling it. */}
      <span className="absolute inset-y-0 left-[10px] w-[3px] rounded-full bg-robo-gold/15" />
      <span className="absolute inset-x-0 top-0 left-[10px] h-full w-[3px] origin-top scale-y-[var(--trace)] rounded-full bg-robo-gold" />
      {/* The pulse of current at the tip. */}
      <span className="absolute left-[5px] top-[calc(var(--trace)*100%)] size-[13px] -translate-y-1/2 rounded-full border-2 border-robo-gold bg-robo-stage" />
      {PADS.map((at) => (
        <span key={at} data-pad className="group absolute left-0 flex items-center" style={{ top: `${at * 100}%` }}>
          <span className="size-6 -translate-y-1/2 rounded-full border-2 border-robo-gold/30 bg-robo-stage transition-[border-color,background-color,scale] duration-300 ease-spring group-data-lit:scale-110 group-data-lit:border-robo-gold group-data-lit:bg-robo-gold/25" />
          <span className="h-[3px] w-10 -translate-y-1/2 bg-robo-gold/15 transition-colors duration-300 group-data-lit:bg-robo-gold" />
        </span>
      ))}
    </div>
  );
}
