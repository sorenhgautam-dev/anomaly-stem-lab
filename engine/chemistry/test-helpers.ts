import { expect } from "vitest";
import type { Build, ControlDef, ExperimentDef, PropValue, Simulation, StageId } from "../types";

/*
 * Test-only helpers for the chemistry stage models. Imported by *.test.ts
 * files only; nothing in the app depends on this file.
 */

/** A minimal experiment for one chemistry stage. Stage models read only its controls (for defaults). */
export function stageDef(stage: StageId, controls: ControlDef[] = []): ExperimentDef {
  return {
    id: `chemistry-${stage}-test`,
    lab: "chemistry",
    level: "easy",
    grades: "6-8",
    order: 1,
    title: "Test",
    goal: "Test the stage model.",
    intro: "Test.",
    minutes: 2,
    stage,
    parts: [],
    outlines: false,
    controls,
    prediction: { type: "choice", question: "?", options: ["More", "The same", "Less"] },
    answer: { kind: "compare", a: "scale.end", b: "scale.start", tolerance: 0.0005, aBigger: "More", bBigger: "Less", same: "The same" },
    misconceptions: [],
    allowedEdits: [],
    theoryId: "test",
  };
}

export function buildWith(def: ExperimentDef, settings: Record<string, PropValue>): Build {
  return { experimentId: def.id, parts: [], connections: [], settings };
}

/** One timeline value, frame by frame. */
export function series(sim: Simulation, key: string): number[] {
  return (sim.timeline ?? []).map((frame) => frame.values[key]);
}

/** Frame times, in display seconds. */
export function times(sim: Simulation): number[] {
  return (sim.timeline ?? []).map((frame) => frame.t);
}

/**
 * Every chemistry run: 61 frames from t = 0 to t = 10 s carrying exactly
 * these timeline keys, exactly these readings, finite numbers everywhere and
 * no faults. The UI renders from these exact names.
 */
export function expectWellFormed(sim: Simulation, timelineKeys: string[], readingKeys: string[]): void {
  const frames = sim.timeline ?? [];
  expect(frames).toHaveLength(61);
  expect(frames[0].t).toBe(0);
  expect(frames[frames.length - 1].t).toBeCloseTo(10, 9);
  for (let i = 1; i < frames.length; i++) expect(frames[i].t).toBeGreaterThan(frames[i - 1].t);
  for (const frame of frames) {
    expect(Object.keys(frame.values).sort()).toEqual([...timelineKeys].sort());
    for (const value of Object.values(frame.values)) expect(Number.isFinite(value)).toBe(true);
  }
  expect(Object.keys(sim.readings).sort()).toEqual([...readingKeys].sort());
  for (const value of Object.values(sim.readings)) expect(Number.isFinite(value)).toBe(true);
  expect(sim.faults).toEqual([]);
}
