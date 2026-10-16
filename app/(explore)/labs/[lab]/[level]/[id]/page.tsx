import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LabExperiment } from "@/components/lab/LabExperiment";
import { allExperimentParams, experimentsFor, getExperiment, isLab, isLevel } from "@/lib/content";

export function generateStaticParams() {
  return allExperimentParams();
}

export async function generateMetadata({ params }: PageProps<"/labs/[lab]/[level]/[id]">) {
  const { id } = await params;
  const experiment = getExperiment(id);
  return { title: experiment ? `${experiment.title} · ANOMALY` : "ANOMALY" };
}

// One experiment: the lab HUD and the predict → run → verdict loop. Params
// are read behind Suspense so navigations stay instant.
export default function ExperimentPage({ params }: PageProps<"/labs/[lab]/[level]/[id]">) {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <Experiment params={params} />
    </Suspense>
  );
}

async function Experiment({ params }: { params: PageProps<"/labs/[lab]/[level]/[id]">["params"] }) {
  const { lab, level, id } = await params;
  const experiment = getExperiment(id);
  if (!isLab(lab) || !isLevel(level) || !experiment || experiment.lab !== lab || experiment.level !== level) notFound();

  const siblings = experimentsFor(lab, level);
  const next = siblings.find((e) => e.order > experiment.order);
  const mapHref = `/labs/${lab}/${level}`;

  return <LabExperiment id={id} nextHref={next ? `${mapHref}/${next.id}` : null} mapHref={mapHref} />;
}
