import { ExploreBar } from "@/components/explore/ExploreBar";
import { levelPicks } from "@/components/explore/level-picks";
import { LevelSelect } from "@/components/explore/LevelSelect";
import { Frame } from "@/components/ui/Frame";

export const metadata = { title: "Pick your level · ANOMALY" };

/*
 * Choose your level (DESIGN.md §7.2, CLAUDE.md §1.1): a level knob, the
 * level's periodic-table tile that flips as the knob turns, its real
 * experiment count and the beliefs it breaks, its experiments on a shelf as
 * real apparatus, and Ano standing in the headline, reacting to each level.
 */
export default function StartPage() {
  return (
    <Frame tint="sage">
      <ExploreBar />
      <main className="relative flex flex-1 flex-col px-4 pb-28 pt-10 sm:px-8 md:pt-14">
        <LevelSelect levels={levelPicks()} intro="Turn the knob to your grade. Not sure? Start with Easy: you can switch level or lab any time from the top bar." />
      </main>
    </Frame>
  );
}
