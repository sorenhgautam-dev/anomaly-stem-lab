"use client";

import { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";
import type { ReplayMoment } from "@/lib/replay";
import { prefersReducedMotion } from "@/lib/motion";
import { labView } from "@/components/lab3d/lab-state";
import { playback } from "./playback";
import { WRONG_HOLD_MS } from "./VerdictMoment";

/*
 * "The exact moment you were wrong": once the ANOMALY word has gone, the run
 * replays from the start and pauses itself where the student's idea and
 * reality first split (lib/replay.ts). The chart, the 3D marker and Ano's
 * line all read this small store; playback time itself stays in playback.ts.
 * Reduced motion jumps straight to the moment instead of playing up to it.
 */

/** idle: nothing to show · waiting: the verdict moment is still on screen · playing: on the way to the moment · paused: stopped at it · watching: the student took over */
export type ReplayStatus = "idle" | "waiting" | "playing" | "paused" | "watching";

interface ReplayState {
  status: ReplayStatus;
  moment: ReplayMoment | null;
}

export const useReplayState = create<ReplayState>()(() => ({ status: "idle", moment: null }));

const setStatus = (status: ReplayStatus) => useReplayState.setState({ status });

export function useReplay(moment: ReplayMoment | null, runId: number) {
  const offFrame = useRef<(() => void) | null>(null);
  const offState = useRef<(() => void) | null>(null);
  const ours = useRef(false);

  const detach = useCallback(() => {
    offFrame.current?.();
    offFrame.current = null;
    offState.current?.();
    offState.current = null;
  }, []);

  const stopAt = useCallback((m: ReplayMoment) => {
    detach();
    ours.current = true;
    playback.pause();
    playback.seek(m.t);
    ours.current = false;
    setStatus("paused");
    // Ano points at the part that shows it (LabAno), and the marker rings there (ReplayMarker).
    labView.point += 1;
  }, [detach]);

  const start = useCallback(() => {
    if (!moment) return;
    detach();
    if (prefersReducedMotion()) {
      stopAt(moment);
      return;
    }
    setStatus("playing");
    ours.current = true;
    playback.setSpeed(1);
    playback.restart();
    ours.current = false;
    offFrame.current = playback.onFrame((t) => {
      if (playback.playing && t >= moment.t) stopAt(moment);
    });
    // The student paused or scrubbed on the way: they're in charge now.
    offState.current = playback.onState(() => {
      if (!ours.current && !playback.playing && useReplayState.getState().status === "playing") {
        detach();
        setStatus("watching");
      }
    });
  }, [moment, stopAt, detach]);

  const keepWatching = useCallback(() => {
    detach();
    setStatus("watching");
    playback.play();
  }, [detach]);

  useEffect(() => {
    useReplayState.setState({ status: moment ? "waiting" : "idle", moment });
    if (!moment) return;
    // Starts once the ANOMALY word has left, so the replay is seen, not hidden behind it.
    const id = window.setTimeout(start, WRONG_HOLD_MS + 150);
    // Play pressed on the scrubber while stopped at the moment counts as "Keep watching".
    const offPlay = playback.onState(() => {
      if (playback.playing && useReplayState.getState().status === "paused") setStatus("watching");
    });
    return () => {
      window.clearTimeout(id);
      offPlay();
      detach();
      useReplayState.setState({ status: "idle", moment: null });
    };
  }, [moment, runId, start, detach]);

  return { start, keepWatching };
}
