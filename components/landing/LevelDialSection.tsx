import landing from "@/content/landing.json";
import { levelPicks } from "@/components/explore/level-picks";
import { LevelPicker } from "@/components/explore/LevelPicker";
import { SectionHeading } from "./SectionHeading";

/*
 * The level dial (DESIGN.md §7.1 item 5): one dial from grade 6 to 12 and
 * one card that updates to the matching level and its real experiments, in
 * place of a row of three level cards.
 */
export function LevelDialSection() {
  return (
    <section aria-labelledby="levels" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-8 sm:py-32">
      <SectionHeading id="levels" title={landing.levels.title} className="mx-auto text-center">
        {landing.levels.body}
      </SectionHeading>
      <LevelPicker levels={levelPicks()} className="mt-12" />
    </section>
  );
}
