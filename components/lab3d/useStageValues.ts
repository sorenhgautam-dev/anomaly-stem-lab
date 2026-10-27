"use client";

import { useMemo } from "react";
import { realModel } from "@/engine/registry";
import type { Outcome } from "@/engine/types";
import { playback, sample } from "@/components/lab/playback";
import { useLab } from "@/lib/store";

/*
 * The values a 3D stage draws from, read inside useFrame (never React state
 * per frame, CLAUDE.md §9):
 *  - before a run: the real model's first frame for the current build, so the
 *    bench shows starting values without giving the answer away;
 *  - during and after a run: the playback clock over the outcome's timeline;
 *  - after a wrong run: the ghost (the student's belief) at the same moment.
 */

export interface StageValues {
  outcome: Outcome | null;
  ghost: Outcome | null;
  /** Values right now (call each frame). */
  now: () => Record<string, number>;
  /** The ghost's values right now, or null. */
  ghostNow: () => Record<string, number> | null;
  /** Seconds into the run (0 before it). */
  t: () => number;
}

export function useStageValues(): StageValues {
  const def = useLab((s) => s.def)!;
  const build = useLab((s) => s.build)!;
  const phase = useLab((s) => s.phase);
  const result = useLab((s) => s.result);
  const outcome = phase === "build" ? null : (result?.outcome ?? null);
  const ghost = phase === "result" && result?.verdict === "wrong" ? (result.diagnosis?.ghost ?? null) : null;
  const start = useMemo(() => {
    if (outcome) return null;
    try {
      return sample(realModel(def.stage)(def, build).timeline, 0);
    } catch {
      return {};
    }
  }, [def, build, outcome]);
  return useMemo(
    () => ({
      outcome,
      ghost,
      now: () => (outcome ? playback.values() : (start ?? {})),
      ghostNow: () => (ghost ? sample(ghost.timeline, playback.t) : null),
      t: () => (outcome ? playback.t : 0),
    }),
    [outcome, ghost, start],
  );
}
