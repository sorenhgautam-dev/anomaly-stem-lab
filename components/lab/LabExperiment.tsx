"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CircuitPartKind } from "@/engine/types";
import { getExperiment, theoryFor } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import { anomalySting, glassClink, resolveChime, softClick, unlockAudio } from "@/lib/sound";
import { useLab } from "@/lib/store";
import { AnoPanel } from "./AnoPanel";
import { Controls } from "./Controls";
import { Inspector } from "./Inspector";
import { AnomalyMoment, GoldMoment, LabCaption } from "./LabMoments";
import { MissionBar } from "./MissionBar";
import { PartsTray, type DropFn } from "./PartsTray";
import { playback } from "./playback";
import { PredictionPanel } from "./PredictionPanel";
import { ResultPanel } from "./ResultPanel";
import { StageView } from "./StageView";
import { TheoryView } from "./TheoryView";
import { TimeScrubber } from "./TimeScrubber";

/*
 * One experiment, start to finish (CLAUDE.md §6.1): Ano introduces it, the
 * student builds and predicts, Run plays the simulator's result on the
 * playback clock, and the verdict lands when it finishes: ANOMALY + ghost +
 * hints on a wrong prediction, gold + Next experiment on a correct one.
 */

/** How long a run plays: its timeline, or a short power-up for circuits. */
function durationFor(timeline: { t: number }[] | undefined): number {
  if (timeline && timeline.length > 1) return timeline[timeline.length - 1].t;
  return 1.6;
}

export function LabExperiment({ id, nextHref, mapHref }: { id: string; nextHref: string | null; mapHref: string }) {
  const def = getExperiment(id)!;
  const theory = theoryFor(def.theoryId);
  const start = useLab((s) => s.start);
  const phase = useLab((s) => s.phase);
  const result = useLab((s) => s.result);
  const [armed, setArmed] = useState<CircuitPartKind | null>(null);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const [flashId, setFlashId] = useState(0);
  const [goldId, setGoldId] = useState(0);
  const [caption, setCaption] = useState<{ id: number; text: string } | null>(null);
  const drop = useRef<DropFn | null>(null);

  // Start the experiment. Saved evidence seeds the diagnosis once progress
  // has loaded from IndexedDB.
  const hydrated = useProgress((s) => s.hydrated);
  useEffect(() => {
    start(def, useProgress.getState().evidence);
    return () => playback.stop();
  }, [def, start, hydrated]);

  const say = useCallback((text: string) => setCaption((c) => ({ id: (c?.id ?? 0) + 1, text })), []);

  const run = useCallback(() => {
    unlockAudio();
    softClick();
    const outcome = useLab.getState().run();
    if (!outcome) return;
    setArmed(null);
    const timeline = outcome.outcome.timeline;
    playback.setSpeed(1);
    playback.load(timeline, durationFor(timeline), () => {
      useLab.getState().reveal();
      const r = useLab.getState().result;
      if (!r) return;
      if (r.outcome.faults.some((f) => f.startsWith("burnout:") || f === "short-circuit")) {
        glassClink(1, 0.45);
        say(r.outcome.faults.includes("short-circuit") ? "Spark and pop" : "LED pops");
      }
      if (r.verdict === "wrong") {
        setFlashId((n) => n + 1);
        anomalySting();
        say("Glitch sting");
      } else {
        setGoldId((n) => n + 1);
        resolveChime();
        say("Bright chime");
      }
      useProgress.getState().recordRun(def.id, r.verdict === "correct", r.diagnosis?.evidence ?? null, r.diagnosis?.focus ?? null);
    });
  }, [def.id, say]);

  const timeScale = result?.outcome.readings.timeScale ?? 1;

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-24 sm:px-8 sm:pt-28">
      <MissionBar />

      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="relative min-h-[48vh] overflow-hidden rounded-[26px] border border-pearl/8 bg-pearl/[0.02]" aria-label="Experiment">
          <div className="absolute inset-0 p-2 sm:p-4">
            <StageView armed={armed} onPlaced={() => setArmed(null)} registerDrop={(fn) => (drop.current = fn)} />
          </div>
          <GoldMoment id={goldId} />
        </section>
        <div className="flex flex-col gap-4">
          <AnoPanel />
          <Inspector className="flex-1 lg:max-h-[calc(100dvh-24rem)] lg:overflow-y-auto" />
        </div>
      </div>

      <div className="glass flex flex-col gap-5 rounded-[22px] p-5">
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

      <TheoryView theory={theory} open={theoryOpen} onClose={() => setTheoryOpen(false)} />
      <AnomalyMoment id={flashId} />
      <LabCaption caption={caption} />
    </main>
  );
}
