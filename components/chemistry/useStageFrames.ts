"use client";

import { useEffect, useMemo, useRef } from "react";
import { realModel } from "@/engine/registry";
import type { Build, ExperimentDef, Outcome } from "@/engine/types";
import { playback, sample } from "@/components/lab/playback";

export type Frame = (t: number, values: Record<string, number>) => void;

/**
 * Drive a stage from the right source of truth, without React re-renders:
 *  - before a run: the real model's first frame for the current build
 *    (starting values only, so nothing gives the answer away);
 *  - during and after a run: the playback clock over the outcome's timeline.
 * The callback writes to refs / SVG attributes directly.
 */
export function useStageFrames(def: ExperimentDef, build: Build, outcome: Outcome | null, onFrame: Frame) {
  const fn = useRef(onFrame);
  useEffect(() => {
    fn.current = onFrame;
  });

  const startValues = useMemo(() => {
    if (outcome) return null;
    try {
      const sim = realModel(def.stage)(def, build);
      return sample(sim.timeline, 0);
    } catch {
      return {};
    }
  }, [def, build, outcome]);

  useEffect(() => {
    if (!outcome) {
      fn.current(0, startValues ?? {});
      return;
    }
    return playback.onFrame((t, values) => fn.current(t, values));
  }, [outcome, startValues]);
}

/** The ghost's timeline sampled at the same moment as reality. */
export function ghostAt(ghost: Outcome | null, t: number): Record<string, number> | null {
  return ghost ? sample(ghost.timeline, t) : null;
}
