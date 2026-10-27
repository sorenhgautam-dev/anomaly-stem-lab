import { ViewTransition } from "react";
import { EXPERIMENTS } from "@/lib/content";
import { BeliefSection } from "@/components/landing/BeliefSection";
import { FinalCta } from "@/components/landing/FinalCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LabsSection } from "@/components/landing/LabsSection";
import { LevelsStrip } from "@/components/landing/LevelsStrip";
import { MeetAno } from "@/components/landing/MeetAno";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SmoothScroll } from "@/components/ui/SmoothScroll";

/*
 * The landing page (DESIGN.md §7.1): the hero carousel with the "Which falls
 * faster?" teaser, then How it works, the two labs, Meet Ano, the belief
 * wall, the levels strip and the final call to action.
 */
export default function Home() {
  return (
    <ViewTransition default="sunrise-wipe">
      <div className="flex flex-col bg-cream-50">
        <SmoothScroll />
        <main className="flex flex-col">
          <Hero count={EXPERIMENTS.length} />
          <HowItWorks />
          <LabsSection />
          <MeetAno />
          <BeliefSection />
          <LevelsStrip />
          <FinalCta />
        </main>
        <SiteFooter />
      </div>
    </ViewTransition>
  );
}
