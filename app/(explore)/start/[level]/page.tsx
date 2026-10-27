import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ExploreBar } from "@/components/explore/ExploreBar";
import { LabCard } from "@/components/landing/LabCard";
import { Frame } from "@/components/ui/Frame";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { comingSoonFor, experimentsFor, isLevel, LAB_INFO, LEVEL_IDS, levelInfo } from "@/lib/content";

export function generateStaticParams() {
  return LEVEL_IDS.map((level) => ({ level }));
}

/*
 * Choose your lab (DESIGN.md §7.3, CLAUDE.md §1.1): Chemistry with a glossy
 * flask, Robotics with a little rover, each with this level's real count.
 * Params are read behind Suspense (instant navigations); the frame carries
 * the level's name, so the level card just clicked grows into it (§9).
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
  const labs = (["chemistry", "robotics"] as const).map((id) => LAB_INFO.find((l) => l.id === id)!);
  return (
    <Frame morph={`level-${level}`}>
      <ExploreBar />
      <main className="relative flex flex-1 flex-col px-4 pb-36 pt-10 sm:px-8 md:pt-14">
        <SplitHeadline className="md:justify-start md:gap-[0.22em]" left="Choose" right="your lab." sizeClassName="text-[clamp(4rem,19vw,6.5rem)] md:text-[clamp(4rem,9.5vw,9rem)]" />
        <SpeechBubble text={`${info.title} it is (${info.grades.toLowerCase()}). Chemicals and particles, or circuits and robots?`} tail="top" className="mt-6 max-w-md" />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {labs.map((lab, i) => {
            const count = experimentsFor(lab.id, level).length;
            const soon = comingSoonFor(lab.id, level).length;
            return (
              <div key={lab.id} className="reveal" style={{ ["--reveal-end" as string]: `${70 + i * 12}%` }}>
                <LabCard lab={lab.id} href={`/labs/${lab.id}/${level}`} morph={`lab-${lab.id}`} title={lab.title} line={lab.line} count={count} cta={soon ? `Open the map · ${soon} coming soon` : "Open the map"} />
              </div>
            );
          })}
        </div>
      </main>
    </Frame>
  );
}
