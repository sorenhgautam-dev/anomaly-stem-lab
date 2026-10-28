import { Frame } from "@/components/ui/Frame";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { StageCard } from "@/components/ui/StageCard";
import { ResultCard } from "@/components/ui/ResultCard";
import { BeliefShiftCard } from "@/components/ui/BeliefShiftCard";
import { AnoView } from "@/components/ano/AnoView";
import { featuredCards } from "@/components/landing/featured";

/** The hero's first featured card, from the engine like the landing's. */
const HERO = featuredCards()[0];

/*
 * The page patterns together (DESIGN.md §2): rounded frame (P1), header
 * (P2), split headline (P3) with the stage card (P4) in the gap, floating
 * cards (P5) and the ribbon (P7), with Ano standing in the gap.
 */

export function PatternsDemo() {
  return (
    <Frame className="md:min-h-[46rem]">
      <SiteHeader />
      <div className="relative flex flex-1 flex-col justify-center px-4 pb-40 pt-10 sm:px-8">
        <div className="relative">
          <StageCard className="left-1/2 top-1/2 hidden h-[118%] w-[30%] -translate-x-1/2 -translate-y-[46%] md:block" />
          <SplitHeadline left="Predict" right="Test it." gap={
              <span className="relative block h-[0.85em] w-[16vw]">
                <AnoView className="absolute left-1/2 top-1/2 h-[2.3em] w-[1.7em] -translate-x-1/2 -translate-y-[56%]" expression="happy" action={{ move: "wave", key: 1 }} />
              </span>
            } />
        </div>
        <div className="pointer-events-none relative mt-8 flex flex-wrap gap-4 md:absolute md:inset-0 md:mt-0">
          <ResultCard float phase={0.6} className="pointer-events-auto relative z-20 md:absolute md:bottom-[18%] md:left-[7%]" {...HERO.result} />
          <BeliefShiftCard float phase={2.8} className="pointer-events-auto relative z-20 hidden sm:block md:absolute md:bottom-[14%] md:right-[6%]" title={HERO.belief.title} detail={HERO.belief.detail} tone={HERO.belief.tone} statusLabel={HERO.belief.status} href="/" />
        </div>
      </div>
    </Frame>
  );
}
