import { ViewTransition } from "react";
import { EXPERIMENTS } from "@/lib/content";
import { FinalCta } from "@/components/landing/FinalCta";
import { featuredCards } from "@/components/landing/featured";
import { Hero } from "@/components/landing/Hero";
import { howSequence } from "@/components/landing/how-sequence";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LabsSection } from "@/components/landing/LabsSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SmoothScroll } from "@/components/ui/SmoothScroll";

/** The hero's cards and How it works, run through the simulator once (the engine is deterministic). */
const FEATURED = featuredCards();
const HOW = howSequence();
// The same sequence for every option, so a visitor can try any guess (all from the simulator, at build time).
const HOW_BY_GUESS = Object.fromEntries(HOW.options.map((o) => [o, howSequence(o)]));

/*
 * The landing page (DESIGN.md §7.1): the hero carousel of three cancer
 * experiments; the problem, on a teal block; then a black and gold stretch
 * for How it works (the real chemo run), the four labs and Meet Ano; then an earthy sage one
 * (Chemistry's sage, sand gold and teal) for the belief deck, the level dial,
 * the final call to action and the footer: the page itself is sage paper,
 * and the black and gold stretch is one rounded block on it, inset like the
 * hero's frame.
 */
export default function Home() {
  return (
    <ViewTransition enter="colour-wipe" exit="colour-wipe" default="none">
      <div className="flex flex-col bg-paper-sage">
        <SmoothScroll />
        <main className="flex flex-col">
          <Hero count={EXPERIMENTS.length} featured={FEATURED} />
          <ProblemSection />
          <div className="relative bg-paper-night md:mx-3 md:rounded-frame">
            <HowItWorks sequences={HOW_BY_GUESS} initial={HOW.guess} />
            <LabsSection />
          </div>
          {/* Hidden in the subtraction pass (owner, 28 October 2026): Meet Ano, the belief deck with the impact counter, and the level dial. Their code stays. */}
          <FinalCta />
        </main>
        <SiteFooter />
      </div>
    </ViewTransition>
  );
}
