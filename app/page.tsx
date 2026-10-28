import { ViewTransition } from "react";
import { EXPERIMENTS } from "@/lib/content";
import { BeliefSection } from "@/components/landing/BeliefSection";
import { FinalCta } from "@/components/landing/FinalCta";
import { featuredCards } from "@/components/landing/featured";
import { Hero } from "@/components/landing/Hero";
import { howSequence } from "@/components/landing/how-sequence";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LabsSection } from "@/components/landing/LabsSection";
import { LevelDialSection } from "@/components/landing/LevelDialSection";
import { MeetAno } from "@/components/landing/MeetAno";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SmoothScroll } from "@/components/ui/SmoothScroll";

/** The hero's cards and How it works, run through the simulator once (the engine is deterministic). */
const FEATURED = featuredCards();
const HOW = howSequence();

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
            <HowItWorks sequence={HOW} />
            <LabsSection />
            <MeetAno />
          </div>
          <BeliefSection />
          <LevelDialSection />
          <FinalCta />
        </main>
        <SiteFooter />
      </div>
    </ViewTransition>
  );
}
