import { describe, expect, it } from "vitest";
import type { PropValue } from "../types";
import { catalystWrongModels, simulateCatalyst } from "./catalyst";
import { buildWith, expectWellFormed, series, stageDef } from "./test-helpers";

/*
 * Expected numbers are worked out by hand. 20 mL of 3% hydrogen peroxide is
 * 0.6 g = 0.01764 mol; 2H2O2 → 2H2O + O2 gives 0.00882 mol of oxygen,
 * 212.15 mL at 20 °C and 1 atm. With 1 g of manganese dioxide half the
 * peroxide is gone every 20 s (first order), so after the 120 s run:
 *   1 g: 212.15 × (1 − 2⁻⁶) = 208.83 mL, starting at 212.15 × ln2 / 20 = 7.35 mL/s
 *   2 g: twice as fast: 14.71 mL/s, 212.10 mL
 * Belief "catalyst used up": the catalyst wears away in step with the
 * peroxide, so 1 g leaves 2⁻⁶ = 1.56% of it.
 */

const def = stageDef("catalyst", [
  { type: "slider", id: "catalyst", label: "Manganese dioxide", min: 0, max: 2, step: 0.1, unit: "g", initial: 1 },
]);

const real = (settings: Record<string, PropValue>) => simulateCatalyst(def, buildWith(def, settings));
const usedUp = (settings: Record<string, PropValue>) =>
  catalystWrongModels["catalyst-used-up"](def, buildWith(def, settings));

const TIMELINE = ["o2", "rate", "catalyst"];
const READINGS = [
  "catalyst.start",
  "catalyst.end",
  "catalyst.leftFraction",
  "o2.ml",
  "rate",
  "activation.kj",
  "activation.uncatalysedKj",
];

describe("catalyst stage: real model", () => {
  it("gives back every gram of catalyst", () => {
    for (const catalyst of [0.5, 1, 2]) {
      const r = real({ catalyst }).readings;
      expect(r["catalyst.start"]).toBe(catalyst);
      expect(r["catalyst.end"]).toBe(catalyst);
      expect(r["catalyst.leftFraction"]).toBe(1);
    }
  });

  it("collects about 209 mL of oxygen in two minutes with 1 g of catalyst", () => {
    const r = real({ catalyst: 1 }).readings;
    expect(r["o2.ml"]).toBeCloseTo(208.83, 1);
    expect(r.rate).toBeCloseTo(7.35, 2);
  });

  it("goes twice as fast with twice the catalyst, but makes no extra oxygen", () => {
    const one = real({ catalyst: 1 }).readings;
    const two = real({ catalyst: 2 }).readings;
    expect(two.rate / one.rate).toBeCloseTo(2, 3);
    expect(two["o2.ml"]).toBeCloseTo(212.1, 1);
    // However much catalyst, the peroxide can only give 212.15 mL.
    expect(real({ catalyst: 50 }).readings["o2.ml"]).toBeLessThanOrEqual(212.15 + 1e-9);
  });

  it("barely reacts at all without a catalyst", () => {
    const r = real({ catalyst: 0 }).readings;
    expect(r["o2.ml"]).toBeLessThan(0.1);
    expect(r["catalyst.leftFraction"]).toBe(1);
  });

  it("lowers the activation energy when the catalyst is there", () => {
    const withIt = real({ catalyst: 1 }).readings;
    const without = real({ catalyst: 0 }).readings;
    expect(without["activation.kj"]).toBe(without["activation.uncatalysedKj"]);
    expect(withIt["activation.kj"]).toBeLessThan(withIt["activation.uncatalysedKj"]);
    expect(withIt["activation.kj"]).toBeGreaterThan(0);
  });

  it("fizzes fastest at the start and slows as the peroxide runs out", () => {
    const sim = real({ catalyst: 1 });
    const o2 = series(sim, "o2");
    const rate = series(sim, "rate");
    expect(o2[0]).toBe(0);
    expect(o2[60]).toBeCloseTo(sim.readings["o2.ml"], 9);
    expect(rate[0]).toBeCloseTo(sim.readings.rate, 9);
    for (let i = 1; i < o2.length; i++) {
      expect(o2[i]).toBeGreaterThan(o2[i - 1]);
      expect(rate[i]).toBeLessThan(rate[i - 1]);
    }
    for (const c of series(sim, "catalyst")) expect(c).toBe(1);
  });

  it("uses the experiment's starting settings when the build has none or they are unusable", () => {
    expect(real({}).readings["catalyst.start"]).toBe(1);
    expect(real({ catalyst: "a pinch" }).readings).toEqual(real({ catalyst: 1 }).readings);
    const bare = stageDef("catalyst");
    expect(simulateCatalyst(bare, buildWith(bare, {})).readings).toEqual(real({ catalyst: 1 }).readings);
  });

  it("treats a negative amount of catalyst as none", () => {
    expect(real({ catalyst: -1 }).readings["catalyst.start"]).toBe(0);
    expect(real({ catalyst: -1 }).readings).toEqual(real({ catalyst: 0 }).readings);
  });

  it("returns a 61-frame timeline over 10 s with the UI's reading names", () => {
    for (const catalyst of [0, 1, 2]) expectWellFormed(real({ catalyst }), TIMELINE, READINGS);
  });
});

describe("catalyst stage: wrong model", () => {
  it("catalyst-used-up: the catalyst wears away as the peroxide breaks down", () => {
    const one = usedUp({ catalyst: 1 }).readings;
    expect(one["catalyst.leftFraction"]).toBeCloseTo(0.0156, 4);
    expect(one["catalyst.end"]).toBeCloseTo(0.0156, 4);
    expect(usedUp({ catalyst: 2 }).readings["catalyst.leftFraction"]).toBeLessThan(0.001);
    // With no catalyst there is nothing to use up.
    expect(usedUp({ catalyst: 0 }).readings["catalyst.leftFraction"]).toBe(1);
  });

  it("catalyst-used-up: same fizz, but the catalyst shrinks away in the ghost", () => {
    const sim = usedUp({ catalyst: 1 });
    expectWellFormed(sim, TIMELINE, READINGS);
    expect(series(sim, "o2")).toEqual(series(real({ catalyst: 1 }), "o2"));
    const left = series(sim, "catalyst");
    expect(left[0]).toBe(1);
    for (let i = 1; i < left.length; i++) expect(left[i]).toBeLessThan(left[i - 1]);
    expect(left[60]).toBeCloseTo(sim.readings["catalyst.end"], 9);
  });
});
