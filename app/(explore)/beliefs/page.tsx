import { AnoView } from "@/components/ano/AnoView";
import { BeliefGrid } from "@/components/explore/BeliefGrid";
import { ExploreBar } from "@/components/explore/ExploreBar";
import { Frame } from "@/components/ui/Frame";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { beliefItems } from "@/lib/beliefs";

export const metadata = { title: "My beliefs · ANOMALY" };

/*
 * My beliefs (DESIGN.md §7.6): every idea Ano can spot. A correct run after a
 * diagnosed wrong one breaks the belief.
 */
export default function BeliefsPage() {
  return (
    <Frame>
      <ExploreBar />
      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-40 pt-10 sm:px-8 md:pt-14">
        <div className="relative">
          <SplitHeadline left="Your" right="beliefs." gap={<span className="block w-[14vw]" />} sizeClassName="text-[clamp(4rem,19vw,6.5rem)] md:text-[clamp(4rem,10vw,9.5rem)]" />
          <AnoView className="relative mx-auto mt-2 h-56 w-44 md:absolute md:left-1/2 md:top-1/2 md:mt-0 md:h-72 md:w-56 md:-translate-x-1/2 md:-translate-y-[55%]" expression="thinking" label="Ano, thinking" />
        </div>
        <BeliefGrid items={beliefItems()} />
      </main>
    </Frame>
  );
}
