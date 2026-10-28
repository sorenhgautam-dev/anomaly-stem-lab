import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ExperimentPath, type MapStar } from "@/components/explore/ExperimentPath";
import { ExploreBar } from "@/components/explore/ExploreBar";
import { HeadlineWithAno } from "@/components/explore/HeadlineWithAno";
import { Frame } from "@/components/ui/Frame";
import { comingSoonFor, experimentsFor, isLab, isLevel, LAB_IDS, LEVEL_IDS, labInfo, levelInfo } from "@/lib/content";

export function generateStaticParams() {
  return LAB_IDS.flatMap((lab) => LEVEL_IDS.map((level) => ({ lab, level })));
}

/*
 * The experiment map for one lab and level (DESIGN.md §7.4, CLAUDE.md §1.1),
 * on a Chem- or Robo-tinted frame. Params are read behind Suspense so
 * navigations stay instant.
 */
export default function MapPage({ params }: PageProps<"/labs/[lab]/[level]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <MapForLabAndLevel params={params} />
    </Suspense>
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
    <Frame tint={lab === "chemistry" ? "teal" : "night"} morph={`lab-${lab}`}>
      <ExploreBar />
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-28 pt-10 sm:px-8 md:pt-14">
        <HeadlineWithAno
          className="text-white"
          left={labInfo(lab).title.replace(" Lab", "")}
          right={`${info.title}.`}
          line={experiments.length > 0 ? "Pick the next experiment. You build a little, then guess. Finish one and the next one opens." : "These experiments are still being built. Try another level or lab for now."}
          expression="happy"
          action={{ move: "wave", key: 1 }}
          sizeClassName="text-[clamp(3.25rem,15vw,6rem)] md:text-[clamp(4rem,8vw,7.5rem)]"
        />
        <ExperimentPath lab={lab} level={level} stars={stars} nextLevel={next ? { id: next, title: levelInfo(next).title } : null} />
      </main>
    </Frame>
  );
}
