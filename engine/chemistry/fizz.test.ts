import { describe, expect, it } from "vitest";
import type { PropValue } from "../types";
import { fizzWrongModels, simulateFizz } from "./fizz";
import { buildWith, expectWellFormed, series, stageDef, times } from "./test-helpers";

/*
 * Expected numbers are worked out by hand:
 *   CO2 made = soda / 84 × 44     (5 g → 2.619 g, 10 g → 5.238 g)
 *   scale at start = 25 g zip bag and cup + 100 g vinegar + soda   (5 g → 130 g)
 *   open bag: 95% of the CO2 escapes → 5 g loses 2.488 g → 127.512 g
 *   sealed bag: 95% of the CO2 is gas at 20 °C and 1 atm (24.05 L/mol)
 *     → 5 g: 0.95 × 5/84 mol × 24.05 L = 1.360 L of gas in the bag
 */

const def = stageDef("fizz", [
  { type: "toggle", id: "sealed", label: "Bag", onLabel: "Sealed", offLabel: "Open", initial: false },
  { type: "slider", id: "soda", label: "Baking soda", min: 2, max: 10, step: 1, unit: "g", initial: 5 },
]);

const real = (settings: Record<string, PropValue>) => simulateFizz(def, buildWith(def, settings));
const belief = (id: string, settings: Record<string, PropValue>) => fizzWrongModels[id](def, buildWith(def, settings));

const TIMELINE = ["scale.grams", "co2.made", "co2.escaped", "bubbles", "bagVolume"];
const READINGS = ["scale.start", "scale.end", "co2.made", "co2.escaped", "bag.volume", "bubbles.peak"];

describe("fizz stage (sealed bag): real model", () => {
  it("turns 44/84 of the baking soda's mass into CO2", () => {
    expect(real({ sealed: false, soda: 5 }).readings["co2.made"]).toBeCloseTo(2.619, 3);
    expect(real({ sealed: true, soda: 10 }).readings["co2.made"]).toBeCloseTo(5.238, 3);
  });

  it("weighs the bag and cup, the vinegar and the baking soda at the start", () => {
    expect(real({ sealed: true, soda: 5 }).readings["scale.start"]).toBeCloseTo(130, 9);
    expect(real({ sealed: false, soda: 8 }).readings["scale.start"]).toBeCloseTo(133, 9);
  });

  it("keeps every gram in a sealed bag", () => {
    const r = real({ sealed: true, soda: 5 }).readings;
    expect(r["scale.end"]).toBeCloseTo(130, 9);
    expect(r["co2.escaped"]).toBe(0);
  });

  it("loses about 95% of the CO2 from an open bag", () => {
    const r = real({ sealed: false, soda: 5 }).readings;
    expect(r["co2.escaped"]).toBeCloseTo(2.488, 3);
    expect(r["scale.end"]).toBeCloseTo(127.512, 3);
    expect(r["bag.volume"]).toBe(0);
  });

  it("fills a sealed bag with the gas, in step with the gas made", () => {
    const v5 = real({ sealed: true, soda: 5 }).readings["bag.volume"];
    const v10 = real({ sealed: true, soda: 10 }).readings["bag.volume"];
    expect(v5).toBeCloseTo(1360, -1);
    expect(v10 / v5).toBeCloseTo(2, 6);
  });

  it("runs out of acid once there is more baking soda than the vinegar can react with", () => {
    // 100 g of 8% vinegar holds 8 / 60.05 = 0.1332 mol of acid → at most 0.1332 × 44 = 5.862 g of CO2.
    expect(real({ sealed: false, soda: 20 }).readings["co2.made"]).toBeCloseTo(5.862, 2);
  });

  it("fizzes harder with more baking soda", () => {
    const low = real({ sealed: false, soda: 2 }).readings["bubbles.peak"];
    const high = real({ sealed: false, soda: 10 }).readings["bubbles.peak"];
    expect(low).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(1);
  });

  it("uses the experiment's starting settings when the build has none or they are unusable", () => {
    const expected = real({ sealed: false, soda: 5 }).readings;
    // Open bag with 5 g of baking soda.
    expect(real({}).readings["co2.made"]).toBeCloseTo(2.619, 3);
    expect(real({}).readings["scale.end"]).toBeCloseTo(127.512, 3);
    expect(real({}).readings).toEqual(expected);
    expect(real({ sealed: "yes", soda: "lots" }).readings).toEqual(expected);
    // No controls at all: the model's own defaults (open bag, 5 g).
    const bare = stageDef("fizz");
    expect(simulateFizz(bare, buildWith(bare, {})).readings).toEqual(expected);
  });

  it("treats an impossible negative amount of baking soda as none", () => {
    const r = real({ sealed: false, soda: -5 }).readings;
    expect(r["co2.made"]).toBe(0);
    expect(r["scale.end"]).toBeCloseTo(125, 9);
  });

  it("returns a 61-frame timeline over 10 s with the UI's reading names", () => {
    expectWellFormed(real({ sealed: false, soda: 5 }), TIMELINE, READINGS);
    expectWellFormed(real({ sealed: true, soda: 10 }), TIMELINE, READINGS);
  });

  it("starts the timeline at the start reading and ends it at the end readings", () => {
    for (const sealed of [true, false]) {
      const sim = real({ sealed, soda: 6 });
      const last = sim.timeline!.length - 1;
      expect(series(sim, "scale.grams")[0]).toBeCloseTo(sim.readings["scale.start"], 9);
      expect(series(sim, "scale.grams")[last]).toBeCloseTo(sim.readings["scale.end"], 9);
      expect(series(sim, "co2.made")[0]).toBe(0);
      expect(series(sim, "co2.made")[last]).toBeCloseTo(sim.readings["co2.made"], 9);
      expect(series(sim, "co2.escaped")[last]).toBeCloseTo(sim.readings["co2.escaped"], 9);
      expect(series(sim, "bagVolume")[last]).toBeCloseTo(sim.readings["bag.volume"], 9);
      expect(Math.max(...series(sim, "bubbles"))).toBeCloseTo(sim.readings["bubbles.peak"], 9);
    }
  });

  it("fizzes fast, then dies away before the run ends", () => {
    const sim = real({ sealed: false, soda: 5 });
    const bubbles = series(sim, "bubbles");
    const peak = Math.max(...bubbles);
    const peakAt = times(sim)[bubbles.indexOf(peak)];
    expect(bubbles[0]).toBe(0);
    expect(peakAt).toBeGreaterThan(0.3);
    expect(peakAt).toBeLessThan(2.5);
    expect(bubbles[bubbles.length - 1]).toBeLessThan(0.05 * peak);
    for (const b of bubbles) expect(b).toBeGreaterThanOrEqual(0);
  });

  it("never lets out more gas than has been made, and the open scale only goes down", () => {
    const sim = real({ sealed: false, soda: 10 });
    const made = series(sim, "co2.made");
    const escaped = series(sim, "co2.escaped");
    const grams = series(sim, "scale.grams");
    expect(escaped).toHaveLength(61);
    expect(escaped[60]).toBeCloseTo(4.976, 3); // 0.95 × 5.238 g
    for (let i = 0; i < made.length; i++) expect(escaped[i]).toBeLessThanOrEqual(made[i] + 1e-12);
    for (let i = 1; i < grams.length; i++) expect(grams[i]).toBeLessThanOrEqual(grams[i - 1] + 1e-12);
    for (const v of series(sim, "bagVolume")) expect(v).toBe(0);
  });

  it("keeps the sealed scale perfectly steady while the bag swells", () => {
    const sim = real({ sealed: true, soda: 5 });
    for (const g of series(sim, "scale.grams")) expect(g).toBeCloseTo(130, 9);
    const volume = series(sim, "bagVolume");
    expect(volume[0]).toBe(0);
    for (let i = 1; i < volume.length; i++) expect(volume[i]).toBeGreaterThanOrEqual(volume[i - 1]);
  });
});

describe("fizz stage (sealed bag): wrong models", () => {
  it("gas-has-no-mass: a sealed bag still loses the mass of the gas", () => {
    const wrong = belief("gas-has-no-mass", { sealed: true, soda: 5 }).readings;
    expect(wrong["scale.end"]).toBeCloseTo(127.381, 3);
    expect(wrong["bag.volume"]).toBeCloseTo(1360, -1);
    expect(real({ sealed: true, soda: 5 }).readings["scale.end"]).toBeCloseTo(130, 9);
  });

  it("gas-has-no-mass: an open bag loses all the gas's mass, not 95%", () => {
    const wrong = belief("gas-has-no-mass", { sealed: false, soda: 5 }).readings;
    expect(wrong["scale.end"]).toBeCloseTo(127.381, 3);
  });

  it("nothing-escapes: an open bag keeps its mass", () => {
    const wrong = belief("nothing-escapes", { sealed: false, soda: 5 }).readings;
    expect(wrong["scale.end"]).toBeCloseTo(130, 9);
    expect(wrong["co2.escaped"]).toBe(0);
    expect(real({ sealed: false, soda: 5 }).readings["scale.end"]).toBeCloseTo(127.512, 3);
  });

  it("wrong models animate their belief with the same timeline names", () => {
    for (const id of ["gas-has-no-mass", "nothing-escapes"]) {
      const sim = belief(id, { sealed: false, soda: 5 });
      expectWellFormed(sim, TIMELINE, READINGS);
      expect(series(sim, "scale.grams").at(-1)).toBeCloseTo(sim.readings["scale.end"], 9);
    }
    // The no-mass belief shows the scale falling even in a sealed bag.
    const sealed = belief("gas-has-no-mass", { sealed: true, soda: 5 });
    expect(series(sealed, "scale.grams").at(-1)).toBeLessThan(series(sealed, "scale.grams")[0]);
  });
});
