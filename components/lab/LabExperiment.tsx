"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { getExperiment, theoryFor } from "@/lib/content";
import { prefersReducedMotion } from "@/lib/motion";
import { useProgress } from "@/lib/progress";
import { useLab, verdictShown } from "@/lib/store";
import { ExploreBar } from "@/components/explore/ExploreBar";
import { LabStage } from "@/components/lab3d/LabStage";
import { labView } from "@/components/lab3d/lab-state";
import { useLabUi } from "@/components/lab3d/lab-ui";
import { stage3d } from "@/components/lab3d/stages/registry";
import { PaperCard } from "@/components/ui/PaperCard";
import { TheorySheet } from "@/components/ui/TheorySheet";
import { toast } from "@/components/ui/Toast";
import { AnoDock } from "./AnoDock";
import { BuildControls } from "./BuildControls";
import { DemoTour } from "./DemoTour";
import { ExplainSimpler } from "./ExplainSimpler";
import { Inspector } from "./Inspector";
import { LabDefProvider } from "./lab-def";
import { LabMicroscope } from "./LabMicroscope";
import { MissionCard } from "./MissionCard";
import { playback } from "./playback";
import { PredictDock } from "./PredictDock";
import { ResultDock } from "./ResultDock";
import { RunStatus } from "./RunStatus";
import { TimeScrubber } from "./TimeScrubber";
import { useRun } from "./useRun";
import { VerdictMoment } from "./VerdictMoment";

/*
 * One experiment, start to finish, in one continuous 3D space (CLAUDE.md
 * §6.1, DESIGN.md §7.5, §8.1). The lab fills the screen; glass HUD panels
 * float over it: mission (top left), inspector (top right), Ano and his
 * bubble (bottom left) and the dock (bottom centre: build, predict and Run;
 * the scrubber; the result). On small screens the lab is a box at the top
 * and the panels follow it, the dock first (so Run is one short scroll
 * away), then Ano, the mission and the inspector; pressing Run brings the
 * lab back into view, so the run and its verdict play where they can be seen.
 */

export function LabExperiment({ id, nextHref, mapHref, demo = false }: { id: string; nextHref: string | null; mapHref: string; demo?: boolean }) {
  const def = getExperiment(id)!;
  const theory = theoryFor(def.theoryId);
  const start = useLab((s) => s.start);
  const phase = useLab((s) => s.phase);
  const result = useLab((s) => s.result);
  const prediction = useLab((s) => s.prediction);
  const runId = useLab((s) => s.runId);
  const verdict = useLab(verdictShown);
  const explore = useLab((s) => s.explore);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const entry = stage3d(def);
  const particles = !!entry.shots(def).particles;
  const zoom = particles ? (entry.zoom ?? { label: "Zoom to particles", caption: "Zoomed in: each dot is a particle." }) : null;

  // Before the first paint (a layout effect), so the dock is built at its full size and nothing jumps.
  useLayoutEffect(() => {
    start(def, useProgress.getState().evidence);
    useLabUi.getState().setParticles(false);
    return () => playback.stop();
  }, [def, start]);
  // Saved evidence seeds the diagnosis once progress has loaded from IndexedDB.
  // It must not restart the attempt: a quick student may already have predicted.
  const hydrated = useProgress((s) => s.hydrated);
  useEffect(() => {
    if (hydrated) useLab.getState().seedEvidence(useProgress.getState().evidence);
  }, [hydrated]);

  const say = useCallback((text: string) => toast(`[${text}]`, 2400), []);
  const { run, runWhatIf, moment } = useRun(def, say, { record: !demo });
  const runInView = useCallback(() => {
    run();
    if (!window.matchMedia("(min-width: 1024px)").matches) labView.el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }, [run]);
  const timeScale = result?.outcome.readings.timeScale ?? 1;
  // The theory opens beside the lab, which dives in to show the idea (particles, current).
  const openTheory = (open: boolean) => {
    setTheoryOpen(open);
    if (particles) useLabUi.getState().setParticles(open);
  };
  const whatHappened =
    result && prediction
      ? `You guessed "${prediction.type === "choice" ? prediction.value : prediction.value}". The lab showed "${result.outcome.result.type === "choice" ? result.outcome.result.value : Math.round(result.outcome.result.value * 100) / 100}".`
      : undefined;

  return (
    <LabDefProvider def={def}>
      <ExploreBar className="lg:fixed lg:inset-x-0 lg:top-0" />
      <main data-phase={phase} data-verdict={verdict ?? undefined} data-explore={explore ? "" : undefined} className="relative flex flex-1 flex-col">
        <LabStage title={def.title} className="h-[50svh] min-h-80 lg:fixed lg:inset-0 lg:h-auto" />
        <div data-lab-hud className="pointer-events-none relative z-20 flex flex-1 flex-col gap-4 p-4 lg:min-h-dvh lg:justify-between lg:px-8 lg:pb-6 lg:pt-24">
          {/* Below lg the two rows dissolve into one column, reordered: dock, Ano, mission, inspector. */}
          <div className="contents lg:flex lg:flex-row lg:items-start lg:justify-between">
            <MissionCard def={def} className="pointer-events-auto order-3 lg:order-none lg:w-[22rem]" />
            <div className="contents lg:flex lg:w-[21rem] lg:flex-col lg:items-end lg:gap-3">
              <Inspector zoom={zoom} className="pointer-events-auto order-4 animate-hud-right [animation-delay:380ms] motion-reduce:animate-none lg:order-none lg:w-full" />
              {(def.stage === "chemo" || def.stage === "cells") && phase !== "result" && <LabMicroscope stage={def.stage} className="hidden w-52 lg:flex xl:w-60" />}
            </div>
          </div>
          <div className="contents lg:flex lg:flex-row lg:items-end">
            <AnoDock className="pointer-events-auto order-2 animate-hud-up [animation-delay:560ms] motion-reduce:animate-none lg:order-none lg:w-[16rem] lg:shrink-0 xl:w-[19rem]" />
            <PaperCard data-lab-dock className="pointer-events-auto order-1 animate-hud-up rounded-sheet p-4 [animation-delay:460ms] motion-reduce:animate-none sm:p-5 lg:order-none lg:min-w-0 lg:flex-1 xl:mx-auto xl:max-w-[58rem]">
              <div key={phase === "result" ? `result-${runId}` : phase} className="flex animate-fade-up flex-col gap-5 motion-reduce:animate-none">
                {phase === "build" && (
                  <>
                    <BuildControls />
                    <PredictDock onRun={runInView} />
                  </>
                )}
                {phase === "running" && (
                  <div className="flex flex-col gap-3">
                    <RunStatus />
                    <TimeScrubber timeScale={timeScale} />
                  </div>
                )}
                {phase === "result" && <ResultDock nextHref={nextHref} mapHref={mapHref} onTheory={() => openTheory(true)} onWhatIf={runWhatIf} timeScale={timeScale} />}
              </div>
            </PaperCard>
          </div>
        </div>
        <VerdictMoment moment={moment} />
        {demo && <DemoTour onRun={runInView} />}
        <TheorySheet theory={theory} open={theoryOpen} onOpenChange={openTheory} whatHappened={whatHappened} overlay="clear" afterWhy={theory && <ExplainSimpler key={runId} text={theory.body.join(" ")} />} tryAtHome={def.tryAtHome} />
        {!prediction && phase === "build" && <span className="sr-only">Pick your guess, then press Run.</span>}
      </main>
    </LabDefProvider>
  );
}
