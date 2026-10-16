import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AnoLine } from "@/components/explore/AnoLine";
import { LabChoice } from "@/components/explore/LabChoice";
import { experimentsFor, isLevel, LAB_INFO, LEVEL_IDS, levelInfo } from "@/lib/content";

export function generateStaticParams() {
  return LEVEL_IDS.map((level) => ({ level }));
}

// Choose your lab (CLAUDE.md §1.1). The heading is the shared shell; the
// level-specific part reads params behind Suspense (instant navigations).
export default function LabChoicePage({ params }: PageProps<"/start/[level]">) {
  return (
    <main className="flex flex-1 flex-col pt-28 sm:pt-32">
      <div className="relative z-10 px-5 sm:px-10">
        <h1 className="type-headline text-[clamp(3rem,7vw,6.5rem)]">
          Choose your <span className="type-accent">lab</span>
        </h1>
      </div>
      <Suspense fallback={<div className="flex-1" />}>
        <LabChoiceForLevel params={params} />
      </Suspense>
    </main>
  );
}

async function LabChoiceForLevel({ params }: { params: PageProps<"/start/[level]">["params"] }) {
  const { level } = await params;
  if (!isLevel(level)) notFound();
  const info = levelInfo(level);
  const options = LAB_INFO.map((lab) => ({ ...lab, count: experimentsFor(lab.id, level).length }));
  return (
    <>
      <div className="relative z-10 px-5 sm:px-10">
        <AnoLine
          className="mt-5"
          text={`${info.title} it is (${info.grades.toLowerCase()}). Circuits and robots, or chemicals and particles?`}
        />
      </div>
      <LabChoice level={level} options={options} />
    </>
  );
}
