import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AnoLine } from "@/components/explore/AnoLine";
import { ExperimentMap, type MapStar } from "@/components/explore/ExperimentMap";
import {
  comingSoonFor,
  experimentsFor,
  isLab,
  isLevel,
  LAB_IDS,
  LEVEL_IDS,
  labInfo,
  levelInfo,
} from "@/lib/content";

export function generateStaticParams() {
  return LAB_IDS.flatMap((lab) => LEVEL_IDS.map((level) => ({ lab, level })));
}

// The experiment map for one lab and level (CLAUDE.md §1.1). Params are read
// behind Suspense so navigations stay instant.
export default function MapPage({ params }: PageProps<"/labs/[lab]/[level]">) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-16 pt-28 sm:px-10 sm:pt-36">
      <Suspense fallback={<div className="h-40" />}>
        <MapForLabAndLevel params={params} />
      </Suspense>
    </main>
  );
}

async function MapForLabAndLevel({ params }: { params: PageProps<"/labs/[lab]/[level]">["params"] }) {
  const { lab, level } = await params;
  if (!isLab(lab) || !isLevel(level)) notFound();

  const experiments = experimentsFor(lab, level);
  const soon = comingSoonFor(lab, level);
  const stars: MapStar[] = [
    ...experiments.map((e) => ({ id: e.id, title: e.title, minutes: e.minutes, order: e.order })),
    ...soon.map((c, i) => ({ id: null, title: c.title, minutes: null, order: experiments.length + i + 1 })),
  ];
  const next = LEVEL_IDS[LEVEL_IDS.indexOf(level) + 1];
  const info = levelInfo(level);

  return (
    <>
      <h1 className="type-headline text-[clamp(3rem,7vw,6.5rem)]">
        {labInfo(lab).title.replace(" Lab", "")} <span className="type-accent">{info.title.toLowerCase()}</span>
      </h1>
      <AnoLine
        className="mt-5"
        text={
          experiments.length > 0
            ? "Pick the glowing star. Each one is a short build and one prediction. Finish one to unlock the next."
            : "These experiments are still being built. Try another level or lab for now."
        }
      />
      <ExperimentMap
        lab={lab}
        level={level}
        stars={stars}
        nextLevel={next ? { id: next, title: levelInfo(next).title } : null}
      />
    </>
  );
}
