import { describe, expect, it } from "vitest";
import type { PropValue } from "../types";
import { dissolveWrongModels, simulateDissolve } from "./dissolve";
import { buildWith, expectWellFormed, series, stageDef } from "./test-helpers";

/*
 * Expected numbers are worked out by hand:
 *   scale = 120 g beaker + 200 g water + sugar   (20 g → 340 g, 50 g → 370 g)
 *   sugar dissolves up to about 2 g per gram of water at 20 °C → 400 g in 200 g of water.
 */

const def = stageDef("dissolve", [
  { type: "slider", id: "sugar", label: "Sugar", min: 10, max: 50, step: 5, unit: "g", initial: 20 },
]);

const real = (settings: Record<string, PropValue>) => simulateDissolve(def, buildWith(def, settings));
const gone = (settings: Record<string, PropValue>) =>
  dissolveWrongModels["dissolved-means-gone"](def, buildWith(def, settings));

const TIMELINE = ["scale.grams", "sugar.dissolved", "spread"];
const READINGS = ["scale.start", "scale.end", "sugar.grams", "sugar.dissolved"];

describe("dissolve stage: real model", () => {
  it("weighs the beaker, the water and the sugar at the start", () => {
    expect(real({ sugar: 20 }).readings["scale.start"]).toBeCloseTo(340, 9);
    expect(real({ sugar: 50 }).readings["scale.start"]).toBeCloseTo(370, 9);
    expect(real({ sugar: 50 }).readings["sugar.grams"]).toBe(50);
  });

  it("keeps every gram when the sugar dissolves", () => {
    for (const sugar of [10, 20, 35, 50]) {
      const r = real({ sugar }).readings;
      expect(r["scale.end"]).toBeCloseTo(320 + sugar, 9);
    }
  });

  it("dissolves all the sugar on the slider (far below what water can hold)", () => {
    expect(real({ sugar: 10 }).readings["sugar.dissolved"]).toBeCloseTo(1, 9);
    expect(real({ sugar: 50 }).readings["sugar.dissolved"]).toBeCloseTo(1, 9);
  });

  it("leaves crystals once the water is saturated, and still keeps the mass", () => {
    // 200 g of water holds about 400 g of sugar: 400 / 500 = 0.8 dissolves.
    const r = real({ sugar: 500 }).readings;
    expect(r["sugar.dissolved"]).toBeCloseTo(0.8, 6);
    expect(r["scale.end"]).toBeCloseTo(820, 9);
  });

  it("uses the experiment's starting settings when the build has none or they are unusable", () => {
    expect(real({}).readings["scale.start"]).toBeCloseTo(340, 9);
    expect(real({ sugar: "a spoonful" }).readings).toEqual(real({ sugar: 20 }).readings);
    const bare = stageDef("dissolve");
    expect(simulateDissolve(bare, buildWith(bare, {})).readings["sugar.grams"]).toBe(20);
  });

  it("treats an impossible negative amount of sugar as none", () => {
    const r = real({ sugar: -10 }).readings;
    expect(r["sugar.grams"]).toBe(0);
    expect(r["scale.start"]).toBeCloseTo(320, 9);
    expect(r["scale.end"]).toBeCloseTo(320, 9);
  });

  it("returns a 61-frame timeline over 10 s with the UI's reading names", () => {
    expectWellFormed(real({ sugar: 20 }), TIMELINE, READINGS);
    expectWellFormed(real({ sugar: 50 }), TIMELINE, READINGS);
  });

  it("holds the scale steady through the whole run", () => {
    const grams = series(real({ sugar: 30 }), "scale.grams");
    expect(grams).toHaveLength(61);
    for (const g of grams) expect(g).toBeCloseTo(350, 9);
  });

  it("dissolves smoothly from none to all", () => {
    const dissolved = series(real({ sugar: 20 }), "sugar.dissolved");
    expect(dissolved).toHaveLength(61);
    expect(dissolved[0]).toBe(0);
    expect(dissolved[60]).toBeCloseTo(1, 9);
    for (let i = 1; i < dissolved.length; i++) {
      expect(dissolved[i]).toBeGreaterThanOrEqual(dissolved[i - 1]);
      expect(dissolved[i] - dissolved[i - 1]).toBeLessThan(0.05);
    }
  });

  it("spreads the sugar evenly through the water by the end", () => {
    const spread = series(real({ sugar: 20 }), "spread");
    expect(spread).toHaveLength(61);
    expect(spread[0]).toBe(0);
    expect(spread[60]).toBeCloseTo(1, 9);
    for (let i = 1; i < spread.length; i++) expect(spread[i]).toBeGreaterThanOrEqual(spread[i - 1]);
    for (const s of spread) expect(s).toBeLessThanOrEqual(1);
  });
});

describe("dissolve stage: wrong model", () => {
  it("dissolved-means-gone: the scale drops by the sugar that dissolved", () => {
    expect(gone({ sugar: 20 }).readings["scale.end"]).toBeCloseTo(320, 9);
    expect(gone({ sugar: 50 }).readings["scale.end"]).toBeCloseTo(320, 9);
    expect(real({ sugar: 20 }).readings["scale.end"]).toBeCloseTo(340, 9);
    // Saturated: only the 400 g that dissolved "vanishes".
    expect(gone({ sugar: 500 }).readings["scale.end"]).toBeCloseTo(420, 9);
  });

  it("dissolved-means-gone: the scale falls as the sugar dissolves", () => {
    const sim = gone({ sugar: 20 });
    expectWellFormed(sim, TIMELINE, READINGS);
    const grams = series(sim, "scale.grams");
    const dissolved = series(sim, "sugar.dissolved");
    for (let i = 0; i < grams.length; i++) expect(grams[i]).toBeCloseTo(340 - 20 * dissolved[i], 9);
    expect(grams[60]).toBeCloseTo(320, 9);
  });
});
