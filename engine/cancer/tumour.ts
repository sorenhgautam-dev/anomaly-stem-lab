import type { Simulate } from "../types";
import { makeTimeline, numberSetting, RUN_SECONDS } from "../chemistry/common";

/*
 * Stage "tumour": how a cluster of cells grows when it keeps doubling
 * (experiment "How tumours grow", CLAUDE.md §3.2). A teaching model: the
 * number of cells doubles every fixed interval, N(t) = N0 × 2^(t / d). Its
 * months and doubling times are model values, not real ones.
 *
 * Settings: `doubling` (model months per doubling), `months` (how long to
 *   watch), `start` (cells at the start).
 * Readings:
 *   cells.start, cells.end
 *   growth.firstHalf, growth.secondHalf   cells added in each half of the watch
 *   growth.ratio                          second half ÷ first half
 * Timeline values: cells, size (diameter compared with the start, ∝ cells^⅓),
 *   share (cells as a share of the end count, 0..1), month (model months).
 *
 * Wrong models:
 *   tumour-grows-steadily   the same number of cells every month
 *   tumour-slows-down       fast at first, then levelling off
 */

type Belief = "real" | "tumour-grows-steadily" | "tumour-slows-down";

function tumourModel(belief: Belief): Simulate {
  return (def, build) => {
    const doubling = numberSetting(def, build, "doubling", 2, 0.5, 6);
    const months = numberSetting(def, build, "months", 30, 6, 60);
    const start = numberSetting(def, build, "start", 8, 1, 1000);
    const end = start * 2 ** (months / doubling);
    // Every belief reaches the same end size; only the shape of the way there differs.
    const cellsAt = (m: number) => {
      const k = m / months;
      if (belief === "real") return start * 2 ** (m / doubling);
      if (belief === "tumour-grows-steadily") return start + (end - start) * k;
      return start + (end - start) * (1 - (1 - k) ** 3);
    };
    const half = months / 2;
    const firstHalf = cellsAt(half) - cellsAt(0);
    const secondHalf = cellsAt(months) - cellsAt(half);
    const timeline = makeTimeline((t) => {
      const m = (t * months) / RUN_SECONDS;
      const cells = cellsAt(m);
      return { cells, size: Math.cbrt(cells / start), share: cells / end, month: m };
    });
    return {
      readings: {
        "cells.start": start,
        "cells.end": cellsAt(months),
        "growth.firstHalf": firstHalf,
        "growth.secondHalf": secondHalf,
        "growth.ratio": secondHalf / Math.max(1e-9, firstHalf),
      },
      faults: [],
      timeline,
    };
  };
}

export const simulateTumour: Simulate = tumourModel("real");

export const tumourWrongModels: Record<string, Simulate> = {
  "tumour-grows-steadily": tumourModel("tumour-grows-steadily"),
  "tumour-slows-down": tumourModel("tumour-slows-down"),
};
