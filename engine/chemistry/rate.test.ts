import { describe, expect, it } from "vitest";
import type { PropValue } from "../types";
import { rateWrongModels, simulateRate } from "./rate";
import { buildWith, expectWellFormed, series, stageDef, times } from "./test-helpers";

/*
 * Expected numbers are worked out by hand from an Arrhenius rate calibrated so
 * a tablet takes 60 s at 20 °C and the rate doubles from 20 °C to 30 °C
 * (activation energy ≈ 51 kJ/mol):
 *   finish time:  10 °C → 126.0 s, 20 °C → 60 s, 30 °C → 30 s, 40 °C → 15.68 s, 60 °C → 4.81 s
 *   default race (10 °C vs 60 °C): timeScale = 126.0 / 9.5 = 13.27 real s per display s
 */

const def = stageDef("rate", [
  { type: "slider", id: "cold", label: "Cold water", min: 5, max: 40, step: 5, unit: "°C", initial: 10 },
  { type: "slider", id: "hot", label: "Hot water", min: 40, max: 90, step: 5, unit: "°C", initial: 60 },
]);

const real = (settings: Record<string, PropValue>) => simulateRate(def, buildWith(def, settings));
const same = (settings: Record<string, PropValue>) =>
  rateWrongModels["temperature-doesnt-matter"](def, buildWith(def, settings));

const TIMELINE = ["cold.remaining", "hot.remaining", "cold.bubbles", "hot.bubbles", "clock"];
const READINGS = ["cold.finish", "hot.finish", "timeScale"];

describe("rate stage: real model", () => {
  it("takes about a minute at room temperature", () => {
    expect(real({ cold: 20, hot: 30 }).readings["cold.finish"]).toBeCloseTo(60, 6);
    expect(real({ cold: 20, hot: 30 }).readings["hot.finish"]).toBeCloseTo(30, 6);
  });

  it("finishes the hot tablet first at the starting temperatures", () => {
    const r = real({ cold: 10, hot: 60 }).readings;
    expect(r["cold.finish"]).toBeCloseTo(126.0, 1);
    expect(r["hot.finish"]).toBeCloseTo(4.81, 2);
    expect(r["hot.finish"]).toBeLessThan(r["cold.finish"]);
  });

  it("roughly doubles the rate for every 10 °C warmer", () => {
    for (let cold = 5; cold <= 80; cold += 5) {
      const r = real({ cold, hot: cold + 10 }).readings;
      const speedUp = r["cold.finish"] / r["hot.finish"];
      expect(speedUp).toBeGreaterThan(1.5);
      expect(speedUp).toBeLessThan(2.3);
    }
  });

  it("finishes both together when the water is the same temperature", () => {
    const r = real({ cold: 40, hot: 40 }).readings;
    expect(r["cold.finish"]).toBeCloseTo(15.68, 2);
    expect(r["hot.finish"]).toBeCloseTo(r["cold.finish"], 9);
  });

  it("scales time so the slower tablet finishes at about t = 9.5 display seconds", () => {
    const sim = real({ cold: 10, hot: 60 });
    expect(sim.readings.timeScale).toBeCloseTo(13.27, 2);
    const i = times(sim).indexOf(9.5);
    expect(i).toBeGreaterThan(0);
    expect(series(sim, "cold.remaining")[i]).toBeCloseTo(0, 9);
    expect(series(sim, "cold.remaining")[i - 1]).toBeGreaterThan(0);
  });

  it("puts real seconds on the clock", () => {
    const sim = real({ cold: 10, hot: 60 });
    const clock = series(sim, "clock");
    const t = times(sim);
    expect(clock).toHaveLength(61);
    for (let i = 0; i < clock.length; i++) expect(clock[i]).toBeCloseTo(t[i] * sim.readings.timeScale, 9);
  });

  it("shrinks each tablet from whole to gone", () => {
    const sim = real({ cold: 15, hot: 45 });
    for (const key of ["cold.remaining", "hot.remaining"]) {
      const left = series(sim, key);
      expect(left).toHaveLength(61);
      expect(left[0]).toBe(1);
      expect(left[60]).toBe(0);
      for (let i = 1; i < left.length; i++) expect(left[i]).toBeLessThanOrEqual(left[i - 1]);
    }
  });

  it("fizzes the hot tablet harder, and each tablet fades as it shrinks", () => {
    const sim = real({ cold: 10, hot: 60 });
    const cold = series(sim, "cold.bubbles");
    const hot = series(sim, "hot.bubbles");
    expect(hot[0]).toBeGreaterThan(cold[0]);
    expect(cold[0]).toBeGreaterThan(0);
    for (const b of [cold, hot]) {
      for (let i = 1; i < b.length; i++) expect(b[i]).toBeLessThanOrEqual(b[i - 1]);
      expect(b[60]).toBe(0);
    }
  });

  it("keeps bubbles between 0 and 1 even in boiling water", () => {
    const sim = real({ cold: 0, hot: 100 });
    expect(series(sim, "hot.bubbles")[0]).toBeGreaterThan(0.9);
    for (const key of ["cold.bubbles", "hot.bubbles"]) {
      expect(series(sim, key)).toHaveLength(61);
      for (const b of series(sim, key)) {
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(1);
      }
    }
  });

  it("keeps the water liquid: below 0 °C counts as 0 °C, above 100 °C as 100 °C", () => {
    const limits = real({ cold: 0, hot: 100 }).readings;
    // Ice-cold water is slower than room temperature; boiling water is far faster.
    expect(limits["cold.finish"]).toBeGreaterThan(126);
    expect(limits["hot.finish"]).toBeLessThan(1);
    expect(real({ cold: -20, hot: 150 }).readings).toEqual(limits);
  });

  it("uses the experiment's starting settings when the build has none or they are unusable", () => {
    expect(real({}).readings["cold.finish"]).toBeCloseTo(126.0, 1);
    expect(real({ cold: "icy", hot: true }).readings).toEqual(real({ cold: 10, hot: 60 }).readings);
    const bare = stageDef("rate");
    expect(simulateRate(bare, buildWith(bare, {})).readings).toEqual(real({ cold: 10, hot: 60 }).readings);
  });

  it("returns a 61-frame timeline over 10 s with the UI's reading names", () => {
    expectWellFormed(real({ cold: 10, hot: 60 }), TIMELINE, READINGS);
    expectWellFormed(real({ cold: 40, hot: 40 }), TIMELINE, READINGS);
  });
});

describe("rate stage: wrong model", () => {
  it("temperature-doesnt-matter: both tablets take the cold tablet's time", () => {
    const r = same({ cold: 10, hot: 60 }).readings;
    expect(r["cold.finish"]).toBeCloseTo(126.0, 1);
    expect(r["hot.finish"]).toBeCloseTo(126.0, 1);
    expect(real({ cold: 10, hot: 60 }).readings["hot.finish"]).toBeCloseTo(4.81, 2);
  });

  it("temperature-doesnt-matter: the two tablets fizz and shrink in lockstep", () => {
    const sim = same({ cold: 10, hot: 60 });
    expectWellFormed(sim, TIMELINE, READINGS);
    expect(series(sim, "hot.remaining")).toEqual(series(sim, "cold.remaining"));
    expect(series(sim, "hot.bubbles")).toEqual(series(sim, "cold.bubbles"));
    // The belief's tablets fizz as gently as the real cold one.
    expect(series(sim, "hot.bubbles")[0]).toBeCloseTo(series(real({ cold: 10, hot: 60 }), "cold.bubbles")[0], 9);
  });
});
