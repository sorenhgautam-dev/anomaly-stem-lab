"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useParallax } from "@/lib/motion";
import { BeliefShiftCard, type BeliefTone } from "@/components/ui/BeliefShiftCard";
import type { Confidence, Status } from "@/components/ui/Chip";
import { ResultCard } from "@/components/ui/ResultCard";

/*
 * The hero's floating glass cards (DESIGN.md §2 P5): a Result card and a
 * Belief shift card at different depths, drifting with the mouse by
 * different amounts, overlapping the stage card's edges as in the reference
 * image. They swap data with each slide, flipping in on a spring. On phones
 * only the Result card shows.
 */

export interface HeroCardData {
  result: { title: string; confidence?: Confidence; prediction: string; reality: string; status: Status | null };
  belief: { title: string; detail: string; tone: BeliefTone; status: string };
  href: string | null;
  /** The reading the stage's 3D instrument shows, from the same run as the cards. */
  stage?: { value: number; unit: string };
}

function Depth({ depth, card, className, children }: { depth: number; card: "result" | "belief"; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useParallax(ref, depth);
  return (
    // data-hero-card: the hero's scroll scene moves each card aside (useHeroScene).
    <div ref={ref} data-hero-card={card} className={cn("relative z-20", className)}>
      {children}
    </div>
  );
}

export function HeroCards({ data, slideKey, action, chipClassName }: { data: HeroCardData; slideKey: string; action?: ReactNode; chipClassName?: string }) {
  return (
    <>
      <Depth depth={14} card="result" className="mx-auto mt-6 w-fit md:absolute md:left-[2%] md:top-[38%] md:mt-0 lg:left-[4%] xl:left-[16%]">
        <div key={slideKey} className="animate-card-in [transform-origin:50%_0%] motion-reduce:animate-none">
          <ResultCard float phase={0.4} {...data.result} action={action} chipClassName={chipClassName} />
        </div>
      </Depth>
      <Depth depth={26} card="belief" className="hidden md:absolute md:right-[2%] md:top-[54%] md:block lg:right-[3%] xl:right-[15%]">
        <div key={slideKey} className="animate-card-in [animation-delay:110ms] [transform-origin:50%_0%] motion-reduce:animate-none">
          {/* A wrong idea the run busted is labelled as one, so the card never "teaches" it. */}
          <BeliefShiftCard float phase={2.6} eyebrow={data.belief.tone === "anomaly" ? "The idea you just busted" : undefined} title={data.belief.title} detail={data.belief.detail} tone={data.belief.tone} statusLabel={data.belief.status} href={data.href ?? undefined} />
        </div>
      </Depth>
    </>
  );
}
