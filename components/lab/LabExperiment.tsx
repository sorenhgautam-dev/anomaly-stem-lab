"use client";

import { useCallback, useEffect, useState } from "react";
import { getExperiment, theoryFor } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import { useLab } from "@/lib/store";
import { ExploreBar } from "@/components/explore/ExploreBar";
import { LabStage } from "@/components/lab3d/LabStage";
import { useLabUi } from "@/components/lab3d/lab-ui";
import { stage3d } from "@/components/lab3d/stages/registry";
import { GlassCard } from "@/components/ui/GlassCard";
import { TheorySheet } from "@/components/ui/TheorySheet";
import { toast } from "@/components/ui/Toast";
import { AnoDock } from "./AnoDock";
import { BuildControls } from "./BuildControls";
import { Inspector } from "./Inspector";
import { MissionCard } from "./MissionCard";
import { playback } from "./playback";
import { PredictDock } from "./PredictDock";
import { ResultDock } from "./ResultDock";
import { TimeScrubber } from "./TimeScrubber";
import { useRun } from "./useRun";
import { VerdictMoment } from "./VerdictMoment";

/*
 * One experiment, start to finish, in one continuous 3D space (CLAUDE.md
 * §6.1, DESIGN.md §7.5, §8.1). The lab fills the screen; glass HUD panels
 * float over it: mission (top left), inspector (top right), Ano and his
 * bubble (bottom left) and the dock (bottom centre: build, predict and Run;
 * the scrubber; the result). On small screens the lab is a tall box and the panels
 * follow it.
 */

export function LabExperiment({ id, nextHref, mapHref }: { id: string; nextHref: string | null; mapHref: string }) {
  const def = getExperiment(id)!;
  const theory = theoryFor(def.theoryId);
  const start = useLab((s) => s.start);
  const phase = useLab((s) => s.phase);
  const result = useLab((s) => s.result);
  const prediction = useLab((s) => s.prediction);
  const runId = useLab((s) => s.runId);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const entry = stage3d(def);
  const particles = !!entry.shots(def).particles;
  const zoom = particles ? (entry.zoom ?? { label: "Zoom to particles", caption: "Zoomed in: each dot is a particle." }) : null;

  // Saved evidence seeds the diagnosis once progress has loaded from IndexedDB.
  const hydrated = useProgress((s) => s.hydrated);
  useEffect(() => {
    start(def, useProgress.getState().evidence);
    useLabUi.getState().setParticles(false);
    return () => playback.stop();
  }, [def, start, hydrated]);

  const say = useCallback((text: string) => toast(`[${text}]`, 2400), []);
  const { run, moment } = useRun(def, say);
  const timeScale = result?.outcome.readings.timeScale ?? 1;
  // The theory opens beside the lab, which dives in to show the idea (particles, current).
  const openTheory = (open: boolean) => {
    setTheoryOpen(open);
    if (particles) useLabUi.getState().setParticles(open);
  };
  const whatHappened =
    result && prediction
      ? `You predicted "${prediction.type === "choice" ? prediction.value : prediction.value}". The simulator showed "${result.outcome.result.type === "choice" ? result.outcome.result.value : Math.round(result.outcome.result.value * 100) / 100}".`
      : undefined;

  return (
    <>
      <ExploreBar className="lg:fixed lg:inset-x-0 lg:top-0" />
      <main data-phase={phase} data-verdict={phase === "result" ? result?.verdict : undefined} className="relative flex flex-1 flex-col">
        <LabStage title={def.title} className="h-[58vh] min-h-80 lg:fixed lg:inset-0 lg:h-auto" />
        <div className="pointer-events-none relative z-20 flex flex-1 flex-col gap-4 p-4 lg:min-h-dvh lg:justify-between lg:px-8 lg:pb-6 lg:pt-24">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <MissionCard def={def} className="pointer-events-auto lg:w-[22rem]" />
            <Inspector zoom={zoom} className="pointer-events-auto lg:w-[21rem]" />
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <AnoDock className="pointer-events-auto lg:w-[16rem] lg:shrink-0 xl:w-[19rem]" />
            <GlassCard className="pointer-events-auto rounded-sheet p-4 sm:p-5 lg:min-w-0 lg:flex-1 xl:mx-auto xl:max-w-[58rem]">
              <div key={phase === "result" ? `result-${runId}` : phase} className="flex animate-fade-up flex-col gap-5 motion-reduce:animate-none">
                {phase === "build" && (
                  <>
                    <BuildControls />
                    <PredictDock onRun={run} />
                  </>
                )}
                {phase === "running" && (
                  <div className="flex flex-col gap-3">
                    <p className="text-[15px] font-semibold" aria-live="polite">
                      Running the simulator…
                    </p>
                    <TimeScrubber timeScale={timeScale} />
                  </div>
                )}
                {phase === "result" && <ResultDock nextHref={nextHref} mapHref={mapHref} onTheory={() => openTheory(true)} timeScale={timeScale} />}
              </div>
            </GlassCard>
          </div>
        </div>
        <VerdictMoment moment={moment} />
        <TheorySheet theory={theory} open={theoryOpen} onOpenChange={openTheory} whatHappened={whatHappened} overlay="clear" />
        {!prediction && phase === "build" && <span className="sr-only">Make a prediction, then press Run.</span>}
      </main>
    </>
  );
}
