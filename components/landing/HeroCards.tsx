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
 * different amounts. They swap data with each slide (popping in again).
 * On phones only the Result card shows.
 */

export interface HeroCardData {
  result: { title: string; confidence?: Confidence; prediction: string; reality: string; status: Status | null };
  belief: { title: string; detail: string; tone: BeliefTone; status: string };
  href: string | null;
}

function Depth({ depth, className, children }: { depth: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useParallax(ref, depth);
  return (
    <div ref={ref} className={cn("relative z-20", className)}>
      {children}
    </div>
  );
}

export function HeroCards({ data, slideKey, action }: { data: HeroCardData; slideKey: string; action?: ReactNode }) {
  return (
    <>
      <Depth depth={14} className="mx-auto mt-6 w-fit md:absolute md:bottom-[1%] md:left-[3%] md:mt-0 lg:left-[5%]">
        <div key={slideKey} className="animate-pop-in motion-reduce:animate-none">
          <ResultCard float phase={0.4} {...data.result} action={action} />
        </div>
      </Depth>
      <Depth depth={26} className="hidden md:absolute md:right-[3%] md:top-[2%] md:block lg:right-[5%]">
        <div key={slideKey} className="animate-pop-in [animation-delay:90ms] motion-reduce:animate-none">
          <BeliefShiftCard float phase={2.6} title={data.belief.title} detail={data.belief.detail} tone={data.belief.tone} statusLabel={data.belief.status} href={data.href ?? undefined} />
        </div>
      </Depth>
    </>
  );
}
