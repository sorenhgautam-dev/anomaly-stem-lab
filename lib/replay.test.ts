import { describe, expect, it } from "vitest";
import { initialBuild } from "@/engine/edits";
import { runExperiment } from "@/engine/run";
import type { TimelineFrame } from "@/engine/types";
import { sample } from "@/components/lab/playback";
import { ALL_EXPERIMENTS, EXPERIMENTS } from "@/lib/content";
import { formatReadout } from "@/lib/readout";
import { firstDivergence, POWER_ON_AT, replayFor, replayLine, replayMoment } from "@/lib/replay";

const frames = (values: number[]): TimelineFrame[] => values.map((v, i) => ({ t: i, values: { x: v } }));

describe("firstDivergence", () => {
  it("finds the first frame past the tolerance", () => {
    expect(firstDivergence(frames([0, 1, 2, 3, 4]), frames([0, 1, 2.05, 4, 6]), "x")).toEqual({ t: 3, real: 3, ghost: 4 });
  });
  it("is null when the runs agree", () => {
    expect(firstDivergence(frames([0, 1, 2]), frames([0, 1, 2]), "x")).toBeNull();
  });
  it("is null for a reading that isn't there", () => {
    expect(firstDivergence(frames([0, 1]), frames([0, 2]), "y")).toBeNull();
  });
});

describe("the moment you were wrong, per experiment", () => {
  const cases = EXPERIMENTS.flatMap((def) => (def.prediction.type === "choice" ? def.prediction.options.map((o) => [def.id, o, def] as const) : []));

  it.each(cases)("%s, guessing %s", (_id, option, def) => {
    const r = runExperiment(def, initialBuild(def), { type: "choice", value: option }, {});
    if (r.verdict === "correct") return;
    expect(replayFor(def.id), `${def.id} has no replay settings`).toBeDefined();
    const ghost = r.diagnosis?.ghost ?? null;
    const m = replayMoment(def.id, r.outcome, ghost);
    if (!ghost) {
      expect(m).toBeNull();
      return;
    }
    expect(m, `${def.id} "${option}": the idea and reality never split`).not.toBeNull();
    // The paused numbers are the simulator's own at that moment.
    if (m!.steady) {
      expect(m!.t).toBe(POWER_ON_AT);
      expect(m!.real).toBe(r.outcome.readings[m!.readout.key]);
      expect(m!.ghost).toBe(ghost.readings[m!.readout.key]);
    } else {
      expect(m!.real).toBeCloseTo(sample(r.outcome.timeline, m!.t)[m!.readout.key], 9);
      expect(m!.ghost).toBeCloseTo(sample(ghost.timeline, m!.t)[m!.readout.key], 9);
    }
    // And they really show as different numbers.
    expect(formatReadout(m!.real, m!.readout)).not.toBe(formatReadout(m!.ghost, m!.readout));
  });

  it("has a line with the real numbers for melting", () => {
    const def = ALL_EXPERIMENTS.find((e) => e.id === "chemistry-melting")!;
    const r = runExperiment(def, initialBuild(def), { type: "choice", value: "Keep rising" }, {});
    const m = replayMoment(def.id, r.outcome, r.diagnosis!.ghost)!;
    expect(m.readout.key).toBe("temperature");
    // Seconds on the run's own clock, the same as the scrubber and the 3D chart's axis.
    expect(m.clock).toBeCloseTo(sample(r.outcome.timeline, m.t).clock, 9);
    expect(replayLine(m, 1)).toBe(`Right here, at ${m.clock!.toFixed(1)} s, the thermometer was at ${formatReadout(m.real, m.readout)}. Your idea said ${formatReadout(m.ghost, m.readout)}.`);
    expect(formatReadout(m.real, m.readout)).toBe("0.0 °C");
  });
});
