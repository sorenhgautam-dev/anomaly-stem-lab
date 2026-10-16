import { describe, expect, it } from "vitest";
import type { PropValue } from "../types";
import { gaslawWrongModels, simulateGaslaw } from "./gaslaw";
import { buildWith, expectWellFormed, series, stageDef } from "./test-helpers";

/*
 * Expected numbers are worked out by hand (Boyle's law at constant 20 °C,
 * P₁V₁ = P₂V₂, starting at 101.325 kPa in 60 mL):
 *   30 mL → 202.65 kPa (×2)   20 mL → 303.975 kPa (×3)   15 mL → 405.3 kPa (×4)
 */

const def = stageDef("gaslaw", [
  { type: "slider", id: "volume", label: "Squeeze to", min: 15, max: 60, step: 5, unit: "mL", initial: 30 },
]);

const real = (settings: Record<string, PropValue>) => simulateGaslaw(def, buildWith(def, settings));
const belief = (id: string, settings: Record<string, PropValue>) => gaslawWrongModels[id](def, buildWith(def, settings));

const TIMELINE = ["volume", "pressure", "hits"];
const READINGS = ["volume.start", "volume.end", "pressure.start", "pressure.end", "pressure.ratio", "pv.ratio"];

describe("gaslaw stage: real model", () => {
  it("starts with 60 mL of air at room pressure", () => {
    const r = real({ volume: 30 }).readings;
    expect(r["volume.start"]).toBe(60);
    expect(r["pressure.start"]).toBeCloseTo(101.325, 3);
  });

  it("doubles the pressure at half the volume", () => {
    const r = real({ volume: 30 }).readings;
    expect(r["volume.end"]).toBe(30);
    expect(r["pressure.end"]).toBeCloseTo(202.65, 2);
    expect(r["pressure.ratio"]).toBeCloseTo(2, 9);
  });

  it("triples it at a third of the volume and quadruples it at a quarter", () => {
    expect(real({ volume: 20 }).readings["pressure.end"]).toBeCloseTo(303.975, 2);
    expect(real({ volume: 15 }).readings["pressure.ratio"]).toBeCloseTo(4, 9);
  });

  it("keeps pressure × volume the same at every squeeze", () => {
    for (const volume of [15, 20, 30, 45, 60]) expect(real({ volume }).readings["pv.ratio"]).toBeCloseTo(1, 9);
  });

  it("pushes the plunger in steadily and the pressure follows P₁V₁ = P₂V₂ all the way", () => {
    const sim = real({ volume: 20 });
    const volume = series(sim, "volume");
    const pressure = series(sim, "pressure");
    const hits = series(sim, "hits");
    expect(volume).toHaveLength(61);
    expect(volume[0]).toBe(60);
    expect(volume[60]).toBeCloseTo(20, 9);
    for (let i = 0; i < volume.length; i++) {
      if (i > 0) expect(volume[i]).toBeLessThanOrEqual(volume[i - 1]);
      expect(pressure[i] * volume[i]).toBeCloseTo(101.325 * 60, 6);
      // Same temperature, same speed: hits on each bit of wall rise with the pressure.
      expect(hits[i]).toBeCloseTo(pressure[i] / 101.325, 9);
    }
  });

  it("uses the experiment's starting settings when the build has none or they are unusable", () => {
    expect(real({}).readings["volume.end"]).toBe(30);
    expect(real({ volume: "tiny" }).readings).toEqual(real({ volume: 30 }).readings);
    const bare = stageDef("gaslaw");
    expect(simulateGaslaw(bare, buildWith(bare, {})).readings).toEqual(real({ volume: 30 }).readings);
  });

  it("can't squeeze the gas to nothing: the plunger stops at 5 mL", () => {
    const r = real({ volume: 0 }).readings;
    expect(r["volume.end"]).toBe(5);
    expect(r["pressure.ratio"]).toBeCloseTo(12, 9);
  });

  it("returns a 61-frame timeline over 10 s with the UI's reading names", () => {
    for (const volume of [15, 30, 60]) expectWellFormed(real({ volume }), TIMELINE, READINGS);
  });
});

describe("gaslaw stage: wrong models", () => {
  it("pressure-ignores-volume: the pressure stays at room pressure however hard you squeeze", () => {
    const r = belief("pressure-ignores-volume", { volume: 30 }).readings;
    expect(r["pressure.end"]).toBeCloseTo(101.325, 3);
    expect(r["pressure.ratio"]).toBe(1);
  });

  it("pressure-follows-volume: half the volume, half the pressure", () => {
    expect(belief("pressure-follows-volume", { volume: 30 }).readings["pressure.ratio"]).toBeCloseTo(0.5, 9);
    expect(belief("pressure-follows-volume", { volume: 20 }).readings["pressure.end"]).toBeCloseTo(33.775, 3);
  });

  it("wrong models animate their belief with the same timeline names", () => {
    for (const id of ["pressure-ignores-volume", "pressure-follows-volume"]) {
      const sim = belief(id, { volume: 30 });
      expectWellFormed(sim, TIMELINE, READINGS);
      expect(series(sim, "pressure")[60]).toBeCloseTo(sim.readings["pressure.end"], 9);
      expect(series(sim, "hits")[60]).toBeCloseTo(sim.readings["pressure.ratio"], 9);
    }
  });
});
