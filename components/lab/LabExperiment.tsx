"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CircuitPartKind } from "@/engine/types";
import { getExperiment, theoryFor } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import { useLab } from "@/lib/store";
import { AnoPanel } from "./AnoPanel";
import { Controls } from "./Controls";
import { Inspector } from "./Inspector";
import { AnomalyMoment, LabCaption } from "./LabMoments";
import { MissionBar } from "./MissionBar";
import { PartsTray, type DropFn } from "./PartsTray";
import { playback } from "./playback";
import { PredictionPanel } from "./PredictionPanel";
import { ResultPanel } from "./ResultPanel";
import { RoomWindow } from "./RoomWindow";
import { StageView } from "./StageView";
import { TheoryView } from "./TheoryView";
import { TimeScrubber } from "./TimeScrubber";
import { useRun } from "./useRun";

/*
 * One experiment, start to finish (CLAUDE.md §6.1): Ano introduces it, the
 * student builds and predicts, Run plays the simulator's result on the
 * playback clock, and the verdict lands when it finishes: ANOMALY + ghost +
 * hints on a wrong prediction, gold + Next experiment on a correct one. The
 * HUD floats over the 3D lab; the stage is a window into it.
 */

export function LabExperiment({ id, nextHref, mapHref }: { id: string; nextHref: string | null; mapHref: string }) {
  const def = getExperiment(id)!;
  const theory = theoryFor(def.theoryId);
  const start = useLab((s) => s.start);
  const phase = useLab((s) => s.phase);
  const result = useLab((s) => s.result);
  const runId = useLab((s) => s.runId);
  const [armed, setArmed] = useState<CircuitPartKind | null>(null);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const [caption, setCaption] = useState<{ id: number; text: string } | null>(null);
  const drop = useRef<DropFn | null>(null);
  const main = useRef<HTMLElement>(null);

  // Start the experiment. Saved evidence seeds the diagnosis once progress
  // has loaded from IndexedDB.
  const hydrated = useProgress((s) => s.hydrated);
  useEffect(() => {
    start(def, useProgress.getState().evidence);
    return () => playback.stop();
  }, [def, start, hydrated]);

  const say = useCallback((text: string) => setCaption((c) => ({ id: (c?.id ?? 0) + 1, text })), []);
  const { run: runExperiment, flashId } = useRun(def, main, say);
  const run = useCallback(() => {
    setArmed(null);
    runExperiment();
  }, [runExperiment]);

  const timeScale = result?.outcome.readings.timeScale ?? 1;

  return (
    <main ref={main} className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-24 sm:px-8 sm:pt-28">
      <MissionBar />

      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <RoomWindow>
          <StageView armed={armed} onPlaced={() => setArmed(null)} registerDrop={(fn) => (drop.current = fn)} />
        </RoomWindow>
        <div className="flex flex-col gap-4">
          <AnoPanel />
          <Inspector className="flex-1 lg:max-h-[calc(100dvh-24rem)] lg:overflow-y-auto" />
        </div>
      </div>

      {/* A steady height, so the window (and the room's camera) doesn't jump between phases. */}
      <div className="glass-hud rounded-[22px] p-5 lg:min-h-52">
        {/* Each phase's controls ease in instead of snapping (CLAUDE.md §3.7). */}
        <div key={phase === "result" ? `result-${runId}` : phase} className="flex animate-hud-in flex-col gap-5">
          {phase === "build" && (
            <>
              {def.stage === "circuit" ? (
                <PartsTray parts={def.parts} armed={armed} onArm={setArmed} drop={() => drop.current} />
              ) : (
                <Controls />
              )}
              <PredictionPanel onRun={run} />
            </>
          )}
          {phase === "running" && (
            <div className="flex flex-col gap-3">
              <p className="text-[15px] text-pearl/70">Running the simulator…</p>
              <TimeScrubber timeScale={timeScale} />
            </div>
          )}
          {phase === "result" && (
            <ResultPanel nextHref={nextHref} mapHref={mapHref} onTheory={() => setTheoryOpen(true)} timeScale={timeScale} />
          )}
        </div>
      </div>

      <TheoryView theory={theory} open={theoryOpen} onClose={() => setTheoryOpen(false)} />
      <AnomalyMoment id={flashId} />
      <LabCaption caption={caption} />
    </main>
  );
}
