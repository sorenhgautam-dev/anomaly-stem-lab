import { describe, expect, it } from "vitest";
import type { PropValue } from "../types";
import { equilibriumWrongModels, simulateEquilibrium } from "./equilibrium";
import { buildWith, expectWellFormed, series, stageDef } from "./test-helpers";

/*
 * Expected numbers are worked out by hand for 2NO2 ⇌ N2O4 with
 * ΔH° = −57.2 kJ/mol and ΔS° = −175.9 J/(mol·K), so Kp = e^(−(ΔH − TΔS)/RT)
 * (bar⁻¹): 10.09 at 20 °C, 0.330 at 70 °C, 56.3 at 0 °C. The sealed tube holds
 * as much nitrogen as 1.7 bar of pure NO2 would at 20 °C.
 *   colour (share of the nitrogen held as brown NO2): 20 °C 0.157, 70 °C 0.571,
 *     80 °C 0.663, 0 °C 0.0721
 *   NO2 share of the molecules: 20 °C 0.271, 70 °C 0.727
 *   belief "heat pushes it forward" (same K at 20 °C, opposite heat effect):
 *     70 °C colour 0.0281, 0 °C colour 0.339
 */

const def = stageDef("equilibrium", [
  { type: "slider", id: "temperature", label: "Water bath", min: 0, max: 80, step: 5, unit: "°C", initial: 70 },
]);

const real = (settings: Record<string, PropValue>) => simulateEquilibrium(def, buildWith(def, settings));
const belief = (id: string, settings: Record<string, PropValue>) =>
  equilibriumWrongModels[id](def, buildWith(def, settings));

const TIMELINE = ["temperature", "no2", "color"];
const READINGS = ["no2.start", "no2.end", "color.start", "color.end"];

describe("equilibrium stage: real model", () => {
  it("starts as a pale brown mix at room temperature", () => {
    const r = real({ temperature: 70 }).readings;
    expect(r["color.start"]).toBeCloseTo(0.157, 3);
    expect(r["no2.start"]).toBeCloseTo(0.271, 3);
  });

  it("turns darker brown in hot water: heat favours the brown NO2", () => {
    const r = real({ temperature: 70 }).readings;
    expect(r["color.end"]).toBeCloseTo(0.571, 3);
    expect(r["no2.end"]).toBeCloseTo(0.727, 3);
    expect(real({ temperature: 80 }).readings["color.end"]).toBeCloseTo(0.663, 3);
  });

  it("turns paler in an ice bath", () => {
    expect(real({ temperature: 0 }).readings["color.end"]).toBeCloseTo(0.0721, 4);
  });

  it("doesn't change at room temperature", () => {
    const r = real({ temperature: 20 }).readings;
    expect(r["color.end"]).toBeCloseTo(r["color.start"], 12);
  });

  it("gets steadily browner the hotter the bath", () => {
    let last = -1;
    for (let temperature = 0; temperature <= 80; temperature += 5) {
      const colour = real({ temperature }).readings["color.end"];
      expect(colour).toBeGreaterThan(last);
      last = colour;
    }
  });

  it("warms the tube gradually, with the colour following the temperature", () => {
    const sim = real({ temperature: 70 });
    const temperature = series(sim, "temperature");
    const colour = series(sim, "color");
    expect(temperature[0]).toBe(20);
    expect(temperature[60]).toBeCloseTo(70, 9);
    expect(colour[0]).toBeCloseTo(sim.readings["color.start"], 12);
    expect(colour[60]).toBeCloseTo(sim.readings["color.end"], 9);
    expect(series(sim, "no2")[60]).toBeCloseTo(sim.readings["no2.end"], 9);
    for (let i = 1; i < colour.length; i++) {
      expect(temperature[i]).toBeGreaterThanOrEqual(temperature[i - 1]);
      expect(colour[i]).toBeGreaterThanOrEqual(colour[i - 1]);
    }
  });

  it("uses the experiment's starting settings when the build has none or they are unusable", () => {
    expect(real({}).readings["color.end"]).toBeCloseTo(0.571, 3);
    expect(real({ temperature: "boiling" }).readings).toEqual(real({ temperature: 70 }).readings);
    const bare = stageDef("equilibrium");
    expect(simulateEquilibrium(bare, buildWith(bare, {})).readings).toEqual(real({ temperature: 70 }).readings);
  });

  it("keeps the bath liquid water: 0 °C to 100 °C", () => {
    expect(real({ temperature: -40 }).readings["color.end"]).toBeCloseTo(0.0721, 4);
    expect(real({ temperature: -40 }).readings).toEqual(real({ temperature: 0 }).readings);
    expect(real({ temperature: 400 }).readings).toEqual(real({ temperature: 100 }).readings);
  });

  it("returns a 61-frame timeline over 10 s with the UI's reading names", () => {
    for (const temperature of [0, 20, 70]) expectWellFormed(real({ temperature }), TIMELINE, READINGS);
  });
});

describe("equilibrium stage: wrong models", () => {
  it("equilibrium-is-frozen: nothing changes once the tube is at equilibrium", () => {
    for (const temperature of [0, 70]) {
      const r = belief("equilibrium-is-frozen", { temperature }).readings;
      expect(r["color.end"]).toBeCloseTo(0.157, 3);
      expect(r["color.end"]).toBe(r["color.start"]);
    }
    const sim = belief("equilibrium-is-frozen", { temperature: 70 });
    expect(series(sim, "temperature")[60]).toBeCloseTo(70, 9);
    for (const c of series(sim, "color")) expect(c).toBe(sim.readings["color.start"]);
  });

  it("heat-pushes-forward: heating makes more colourless N2O4, so hot turns paler and cold darker", () => {
    expect(belief("heat-pushes-forward", { temperature: 70 }).readings["color.end"]).toBeCloseTo(0.0281, 4);
    expect(belief("heat-pushes-forward", { temperature: 0 }).readings["color.end"]).toBeCloseTo(0.339, 3);
    expect(belief("heat-pushes-forward", { temperature: 20 }).readings["color.end"]).toBeCloseTo(0.157, 3);
  });

  it("wrong models animate their belief with the same timeline names", () => {
    for (const id of ["equilibrium-is-frozen", "heat-pushes-forward"]) {
      const sim = belief(id, { temperature: 70 });
      expectWellFormed(sim, TIMELINE, READINGS);
      expect(series(sim, "color")[60]).toBeCloseTo(sim.readings["color.end"], 9);
    }
  });
});
