import { describe, expect, it } from "vitest";
import type { PropValue } from "../types";
import { neutraliseWrongModels, simulateNeutralise } from "./neutralise";
import { buildWith, expectWellFormed, series, stageDef } from "./test-helpers";

/*
 * Expected numbers are worked out by hand. 25 mL of 0.1 M HCl (2.5 mmol H⁺)
 * with V mL of 0.1 M NaOH (0.1·V mmol OH⁻), volumes add:
 *   0 mL → pH 1.000     10 mL → 1.5 mmol / 35 mL left → pH 1.368
 *   24 mL → 0.1 / 49 → pH 2.690     25 mL → pH 7.000 (equivalence)
 *   26 mL → 0.1 mmol OH⁻ / 51 mL → pOH 2.708 → pH 11.292
 *   35 mL → 1.0 / 60 → pH 12.222
 *   dilution only (no reaction): 2.5 mmol / (25 + V) mL → 10 mL: 1.146, 25 mL: 1.301, 35 mL: 1.380
 * Universal indicator: red around pH 1, green at 7, blue to violet above 9.
 */

const def = stageDef("neutralise", [
  { type: "slider", id: "base", label: "Sodium hydroxide added", min: 0, max: 40, step: 1, unit: "mL", initial: 10 },
]);

const real = (settings: Record<string, PropValue>) => simulateNeutralise(def, buildWith(def, settings));
const belief = (id: string, settings: Record<string, PropValue>) =>
  neutraliseWrongModels[id](def, buildWith(def, settings));

const TIMELINE = ["ph", "base", "hue"];
const READINGS = ["ph", "base.ml", "equivalence.ml", "indicator.hue"];

describe("neutralise stage: real model", () => {
  it("starts at pH 1, the pH of 0.1 M hydrochloric acid", () => {
    expect(real({ base: 0 }).readings.ph).toBeCloseTo(1, 3);
  });

  it("stays acidic until all the acid is used up", () => {
    expect(real({ base: 10 }).readings.ph).toBeCloseTo(1.368, 3);
    expect(real({ base: 24 }).readings.ph).toBeCloseTo(2.69, 3);
  });

  it("is neutral exactly at the equivalence point, 25 mL", () => {
    const r = real({ base: 25 }).readings;
    expect(r.ph).toBeCloseTo(7, 6);
    expect(r["equivalence.ml"]).toBeCloseTo(25, 9);
    expect(r["base.ml"]).toBe(25);
  });

  it("turns basic as soon as there is spare base", () => {
    expect(real({ base: 26 }).readings.ph).toBeCloseTo(11.292, 3);
    expect(real({ base: 35 }).readings.ph).toBeCloseTo(12.222, 3);
  });

  it("colours the universal indicator red, then green at neutral, then blue-violet", () => {
    expect(real({ base: 10 }).readings["indicator.hue"]).toBeLessThan(30);
    expect(real({ base: 25 }).readings["indicator.hue"]).toBeCloseTo(120, 6);
    expect(real({ base: 35 }).readings["indicator.hue"]).toBeGreaterThan(240);
  });

  it("adds the base steadily and the pH only ever climbs", () => {
    const sim = real({ base: 40 });
    const base = series(sim, "base");
    const ph = series(sim, "ph");
    expect(base).toHaveLength(61);
    expect(base[0]).toBe(0);
    expect(base[60]).toBeCloseTo(40, 9);
    for (let i = 1; i < base.length; i++) {
      expect(base[i]).toBeGreaterThanOrEqual(base[i - 1]);
      expect(ph[i]).toBeGreaterThanOrEqual(ph[i - 1] - 1e-12);
    }
    expect(ph[60]).toBeCloseTo(sim.readings.ph, 9);
  });

  it("jumps from acidic to basic around the equivalence point", () => {
    const sim = real({ base: 40 });
    const base = series(sim, "base");
    const ph = series(sim, "ph");
    expect(ph.some((p, i) => base[i] < 25 && base[i] > 20 && p < 3)).toBe(true);
    expect(ph.some((p, i) => base[i] > 25 && base[i] < 30 && p > 11)).toBe(true);
  });

  it("uses the experiment's starting settings when the build has none or they are unusable", () => {
    expect(real({}).readings["base.ml"]).toBe(10);
    expect(real({ base: "a splash" }).readings).toEqual(real({ base: 10 }).readings);
    const bare = stageDef("neutralise");
    expect(simulateNeutralise(bare, buildWith(bare, {})).readings).toEqual(real({ base: 10 }).readings);
  });

  it("can't take base back out: a negative volume counts as none", () => {
    expect(real({ base: -5 }).readings["base.ml"]).toBe(0);
    expect(real({ base: -5 }).readings.ph).toBeCloseTo(1, 3);
    expect(real({ base: -5 }).readings).toEqual(real({ base: 0 }).readings);
  });

  it("returns a 61-frame timeline over 10 s with the UI's reading names", () => {
    for (const base of [0, 10, 25, 40]) expectWellFormed(real({ base }), TIMELINE, READINGS);
  });
});

describe("neutralise stage: wrong models", () => {
  it("any-base-neutralises: any base at all makes the solution neutral", () => {
    expect(belief("any-base-neutralises", { base: 10 }).readings.ph).toBe(7);
    expect(belief("any-base-neutralises", { base: 35 }).readings.ph).toBe(7);
    expect(belief("any-base-neutralises", { base: 0 }).readings.ph).toBeCloseTo(1, 3);
  });

  it("base-only-dilutes: base just waters the acid down, so it stays acidic", () => {
    expect(belief("base-only-dilutes", { base: 10 }).readings.ph).toBeCloseTo(1.146, 3);
    expect(belief("base-only-dilutes", { base: 25 }).readings.ph).toBeCloseTo(1.301, 3);
    expect(belief("base-only-dilutes", { base: 35 }).readings.ph).toBeCloseTo(1.38, 3);
  });

  it("wrong models animate their belief with the same timeline names", () => {
    for (const id of ["any-base-neutralises", "base-only-dilutes"]) {
      const sim = belief(id, { base: 35 });
      expectWellFormed(sim, TIMELINE, READINGS);
      expect(series(sim, "ph")[60]).toBeCloseTo(sim.readings.ph, 9);
    }
  });
});
