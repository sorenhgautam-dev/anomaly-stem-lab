import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ExploreBar } from "@/components/explore/ExploreBar";
import { HeadlineWithAno } from "@/components/explore/HeadlineWithAno";
import { LabCard } from "@/components/landing/LabCard";
import { Frame } from "@/components/ui/Frame";
import { comingSoonFor, experimentsFor, isLevel, LEVEL_IDS, levelInfo, VISIBLE_LAB_INFO } from "@/lib/content";

export function generateStaticParams() {
  return LEVEL_IDS.map((level) => ({ level }));
}

/*
 * Choose your lab (DESIGN.md §7.3, CLAUDE.md §8): the four cancer labs in
 * story order (Cell, Prevention, Detection, Treatment), each in its own
 * colours with its apparatus and this level's real count.
 * Params are read behind Suspense (instant navigations); the frame carries
 * the level's name, so the level card just clicked grows into it (§9).
 * Clicking a lab card dives into it before its map opens (LabCard `dive`).
 * Ano stands in the headline and waves as the page opens.
 */
export default function LabChoicePage({ params }: PageProps<"/start/[level]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <LabsForLevel params={params} />
    </Suspense>
  );
}

async function LabsForLevel({ params }: { params: PageProps<"/start/[level]">["params"] }) {
  const { level } = await params;
  if (!isLevel(level)) notFound();
  const info = levelInfo(level);
  const labs = VISIBLE_LAB_INFO;
  return (
    <Frame tint="sage" morph={`level-${level}`}>
      <ExploreBar />
      <main className="relative flex flex-1 flex-col px-4 pb-28 pt-10 sm:px-8 md:pt-14">
        <HeadlineWithAno
          left="Choose"
          right="your lab."
          line={`${info.title} it is (${info.grades.toLowerCase()}). Four labs, one story: what cancer is, preventing it, finding it early, treating it.`}
          expression="curious"
          action={{ move: "wave", key: 1 }}
          sizeClassName="text-[clamp(4rem,19vw,6.5rem)] md:text-[clamp(4rem,9.5vw,9rem)]"
        />
        <div data-lab-grid className="mt-8 grid gap-6 md:grid-cols-2">
          {labs.map((lab, i) => {
            const count = experimentsFor(lab.id, level).length;
            const soon = comingSoonFor(lab.id, level).length;
            return (
              <div key={lab.id} className="animate-card-in [transform-origin:50%_100%] motion-reduce:animate-none" style={{ animationDelay: `${200 + i * 120}ms` }}>
                <LabCard dive lab={lab.id} href={`/labs/${lab.id}/${level}`} morph={`lab-${lab.id}`} title={lab.title} line={lab.line} count={count} soon={soon} cta="Open the map" />
              </div>
            );
          })}
        </div>
      </main>
    </Frame>
  );
}
