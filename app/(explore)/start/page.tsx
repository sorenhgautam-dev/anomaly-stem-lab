import { AnoView } from "@/components/ano/AnoView";
import { ExploreBar } from "@/components/explore/ExploreBar";
import { LevelCard } from "@/components/explore/LevelCard";
import { Frame } from "@/components/ui/Frame";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { comingSoonFor, experimentsFor, LAB_IDS, LEVEL_INFO } from "@/lib/content";

export const metadata = { title: "Pick your level · ANOMALY" };

/*
 * Choose your level (DESIGN.md §7.2, CLAUDE.md §1.1): three tall cards with
 * real experiment counts, and Ano peeking over the Medium card.
 */
export default function StartPage() {
  return (
    <Frame>
      <ExploreBar />
      <main className="relative flex flex-1 flex-col px-4 pb-36 pt-10 sm:px-8 md:pt-14">
        <SplitHeadline className="md:justify-start md:gap-[0.22em]" left="Pick" right="your level." sizeClassName="text-[clamp(4rem,19vw,6.5rem)] md:text-[clamp(4rem,9.5vw,9rem)]" />
        <SpeechBubble text="Not sure? Start with Easy. You can switch level or lab any time from the top bar." tail="top" className="mt-6 max-w-md" />
        <ol className="mt-20 grid gap-6 md:mt-28 md:grid-cols-3 md:items-end">
          {LEVEL_INFO.map((level, i) => (
            // On phones the cards stack, so Medium leaves room above it for Ano.
            <li key={level.id} className={level.id === "medium" ? "reveal pt-36 md:pt-0" : "reveal"} style={{ ["--reveal-end" as string]: `${60 + i * 12}%` }}>
              <LevelCard
                level={level.id}
                index={i}
                title={level.title}
                grades={level.grades}
                line={level.line}
                count={LAB_IDS.reduce((n, lab) => n + experimentsFor(lab, level.id).length, 0)}
                soon={LAB_IDS.reduce((n, lab) => n + comingSoonFor(lab, level.id).length, 0)}
                peek={
                  level.id === "medium" ? (
                    // Ano peeks over the card: the view ends at the card's top edge, so the rest of Ano is "behind" it.
                    <AnoView className="absolute bottom-full left-1/2 h-40 w-56 -translate-x-1/2" framing="peek" pose="peek" expression="happy" label="Ano peeking over the Medium card" />
                  ) : undefined
                }
              />
            </li>
          ))}
        </ol>
      </main>
    </Frame>
  );
}
