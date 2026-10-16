import { describe, expect, it } from "vitest";
import type { PropValue } from "../types";
import { indicatorWrongModels, simulateIndicator } from "./indicator";
import { buildWith, expectWellFormed, series, stageDef } from "./test-helpers";

/*
 * Red cabbage indicator: pink or red in acids, purple near neutral, blue then
 * green in bases. Colour families by hue (degrees): pink/red ≥ 300,
 * purple 250–300, green/blue < 250. Category: 0 acid, 1 neutral, 2 base.
 */

const LIQUIDS = ["lemon", "vinegar", "water", "baking-soda", "soap"];

const def = stageDef("indicator", [
  {
    type: "choice",
    id: "liquid",
    label: "Liquid",
    options: [
      { value: "lemon", label: "Lemon juice" },
      { value: "vinegar", label: "Vinegar" },
      { value: "water", label: "Water" },
      { value: "baking-soda", label: "Baking soda solution" },
      { value: "soap", label: "Soapy water" },
    ],
    initial: "soap",
  },
]);

const real = (settings: Record<string, PropValue>) => simulateIndicator(def, buildWith(def, settings));
const belief = (id: string, settings: Record<string, PropValue>) =>
  indicatorWrongModels[id](def, buildWith(def, settings));

const TIMELINE = ["hue", "mix", "ph"];
const READINGS = ["ph", "indicator.hue", "indicator.category"];

describe("indicator stage: real model", () => {
  it.each([
    // liquid, pH range from household measurements, colour category
    ["lemon", 2, 3, 0],
    ["vinegar", 2, 3.5, 0],
    ["water", 6.9, 7.1, 1],
    ["baking-soda", 8, 9, 2],
    ["soap", 9, 11, 2],
  ] as [string, number, number, number][])("%s has a realistic pH and the right colour family", (liquid, low, high, category) => {
    const r = real({ liquid }).readings;
    expect(r.ph).toBeGreaterThanOrEqual(low);
    expect(r.ph).toBeLessThanOrEqual(high);
    expect(r["indicator.category"]).toBe(category);
  });

  it("turns pink or red in acids, purple when neutral, and green or blue in bases", () => {
    const hue = (liquid: string) => real({ liquid }).readings["indicator.hue"];
    expect(hue("lemon")).toBeGreaterThanOrEqual(300);
    expect(hue("vinegar")).toBeGreaterThanOrEqual(300);
    expect(hue("water")).toBeGreaterThanOrEqual(250);
    expect(hue("water")).toBeLessThan(300);
    expect(hue("baking-soda")).toBeLessThan(250);
    expect(hue("soap")).toBeLessThan(250);
  });

  it("shifts the colour steadily from red through purple to green as the pH rises", () => {
    const sims = LIQUIDS.map((liquid) => real({ liquid }).readings).sort((a, b) => a.ph - b.ph);
    for (let i = 1; i < sims.length; i++) expect(sims[i]["indicator.hue"]).toBeLessThan(sims[i - 1]["indicator.hue"]);
  });

  it("uses the experiment's starting liquid when the build has none or names an unknown one", () => {
    expect(real({}).readings["indicator.category"]).toBe(2);
    expect(real({ liquid: "cola" }).readings).toEqual(real({ liquid: "soap" }).readings);
    expect(real({ liquid: 7 }).readings).toEqual(real({ liquid: "soap" }).readings);
    const bare = stageDef("indicator");
    expect(simulateIndicator(bare, buildWith(bare, {})).readings).toEqual(real({ liquid: "soap" }).readings);
  });

  it("mixes in from the indicator's own purple to the final colour", () => {
    const sim = real({ liquid: "lemon" });
    expectWellFormed(sim, TIMELINE, READINGS);
    const mix = series(sim, "mix");
    const hue = series(sim, "hue");
    expect(mix[0]).toBe(0);
    expect(mix[60]).toBeCloseTo(1, 9);
    for (let i = 1; i < mix.length; i++) expect(mix[i]).toBeGreaterThanOrEqual(mix[i - 1]);
    expect(hue[0]).toBeCloseTo(real({ liquid: "water" }).readings["indicator.hue"], 9);
    expect(hue[60]).toBeCloseTo(sim.readings["indicator.hue"], 9);
    for (const p of series(sim, "ph")) expect(p).toBeCloseTo(sim.readings.ph, 9);
  });

  it("returns a 61-frame timeline over 10 s for every liquid", () => {
    for (const liquid of LIQUIDS) expectWellFormed(real({ liquid }), TIMELINE, READINGS);
  });
});

describe("indicator stage: wrong models", () => {
  it("harsh-means-acid: soap and baking soda read as acids", () => {
    for (const liquid of ["soap", "baking-soda"]) {
      const r = belief("harsh-means-acid", { liquid }).readings;
      expect(r["indicator.category"]).toBe(0);
      expect(r.ph).toBeLessThan(5);
      expect(r["indicator.hue"]).toBeGreaterThanOrEqual(300);
    }
  });

  it("harsh-means-acid: agrees with reality for lemon juice, vinegar and water", () => {
    for (const liquid of ["lemon", "vinegar", "water"]) {
      expect(belief("harsh-means-acid", { liquid }).readings).toEqual(real({ liquid }).readings);
    }
  });

  it("food-cant-be-acid: lemon juice and vinegar read as neutral", () => {
    for (const liquid of ["lemon", "vinegar"]) {
      const r = belief("food-cant-be-acid", { liquid }).readings;
      expect(r["indicator.category"]).toBe(1);
      expect(r.ph).toBe(7);
    }
    for (const liquid of ["water", "baking-soda", "soap"]) {
      expect(belief("food-cant-be-acid", { liquid }).readings).toEqual(real({ liquid }).readings);
    }
  });

  it("wrong models animate their colour with the same timeline names", () => {
    const sim = belief("harsh-means-acid", { liquid: "soap" });
    expectWellFormed(sim, TIMELINE, READINGS);
    expect(series(sim, "hue")[60]).toBeCloseTo(sim.readings["indicator.hue"], 9);
  });
});
