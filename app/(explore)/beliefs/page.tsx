import { BeliefList } from "@/components/explore/BeliefList";
import { CalibrationMeter } from "@/components/explore/CalibrationMeter";
import { RootBeliefs } from "@/components/explore/RootBeliefs";
import { ExploreBar } from "@/components/explore/ExploreBar";
import { HeadlineWithAno } from "@/components/explore/HeadlineWithAno";
import { Frame } from "@/components/ui/Frame";
import { More } from "@/components/ui/More";
import { beliefItems } from "@/lib/beliefs";

export const metadata = { title: "My ideas · ANOMALY" };

/*
 * My beliefs (DESIGN.md §7.6): the root ideas behind the student's wrong
 * guesses, how often sure guesses were right, then every idea Ano can spot in
 * one column grouped by status. A correct run after a diagnosed wrong one
 * breaks the belief.
 */
export default function BeliefsPage() {
  return (
    <Frame tint="sage">
      <ExploreBar />
      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-28 pt-10 sm:px-8 md:pt-14">
        <HeadlineWithAno left="Your" right="ideas." line="These are tricky ideas lots of people have. Test one with its experiment. Get it right and you bust it!" expression="thinking" sizeClassName="text-[clamp(4rem,19vw,6.5rem)] md:text-[clamp(4rem,10vw,9.5rem)]" />
        <BeliefList items={beliefItems()} />
        {/* Subtraction pass: the patterns in your guesses and how sure you were wait behind one small More. */}
        <More label="More about your guesses" className="mx-auto mt-10 w-full max-w-3xl">
          <div className="flex flex-col gap-10">
            <RootBeliefs />
            <CalibrationMeter />
          </div>
        </More>
      </main>
    </Frame>
  );
}
