import { describe, expect, it } from "vitest";
import type { PropValue } from "../types";
import { heatWrongModels, simulateHeat } from "./heat";
import { buildWith, expectWellFormed, series, stageDef, times } from "./test-helpers";

/*
 * Expected numbers are worked out by hand (kelvin = °C + 273.15):
 *   80 °C: volume ratio 353.15 / 293.15 = 1.2047, speed ratio √1.2047 = 1.0976
 *   90 °C: volume ratio 363.15 / 293.15 = 1.2388, speed ratio √1.2388 = 1.1130
 */

const def = stageDef("heat", [
  { type: "slider", id: "temperature", label: "Temperature", min: 20, max: 90, step: 5, unit: "°C", initial: 80 },
]);

const real = (settings: Record<string, PropValue>) => simulateHeat(def, buildWith(def, settings));
const belief = (id: string, settings: Record<string, PropValue>) => heatWrongModels[id](def, buildWith(def, settings));

const TIMELINE = ["temperature", "speed", "size", "count", "volume"];
const READINGS = [
  "temp.start",
  "temp.end",
  "particles.speedRatio",
  "particles.sizeRatio",
  "particles.countRatio",
  "balloon.volumeRatio",
];

describe("heat stage: real model", () => {
  it("speeds the particles up by the square root of the kelvin temperature ratio", () => {
    expect(real({ temperature: 80 }).readings["particles.speedRatio"]).toBeCloseTo(1.0976, 4);
    expect(real({ temperature: 90 }).readings["particles.speedRatio"]).toBeCloseTo(1.113, 4);
  });

  it("grows the balloon in step with the kelvin temperature (Charles's law)", () => {
    expect(real({ temperature: 80 }).readings["balloon.volumeRatio"]).toBeCloseTo(1.2047, 4);
    expect(real({ temperature: 90 }).readings["balloon.volumeRatio"]).toBeCloseTo(1.2388, 4);
  });

  it("keeps every particle the same size and the count the same", () => {
    for (const temperature of [50, 80, 90]) {
      const r = real({ temperature }).readings;
      expect(r["particles.sizeRatio"]).toBe(1);
      expect(r["particles.countRatio"]).toBe(1);
    }
  });

  it("warms the air from 20 °C to the chosen temperature", () => {
    const r = real({ temperature: 65 }).readings;
    expect(r["temp.start"]).toBe(20);
    expect(r["temp.end"]).toBe(65);
  });

  it("changes nothing when the air stays at 20 °C", () => {
    const r = real({ temperature: 20 }).readings;
    expect(r["particles.speedRatio"]).toBe(1);
    expect(r["balloon.volumeRatio"]).toBe(1);
  });

  it("uses the experiment's starting settings when the build has none or they are unusable", () => {
    expect(real({}).readings["temp.end"]).toBe(80);
    expect(real({ temperature: "hot" }).readings).toEqual(real({ temperature: 80 }).readings);
    const bare = stageDef("heat");
    expect(simulateHeat(bare, buildWith(bare, {})).readings["temp.end"]).toBe(80);
  });

  it("keeps an impossible temperature physical instead of breaking the maths", () => {
    const r = real({ temperature: -1000 }).readings;
    expect(r["temp.end"]).toBeGreaterThan(-273.15);
    expect(r["balloon.volumeRatio"]).toBeGreaterThan(0);
    expect(Number.isFinite(r["particles.speedRatio"])).toBe(true);
  });

  it("returns a 61-frame timeline over 10 s with the UI's reading names", () => {
    expectWellFormed(real({ temperature: 80 }), TIMELINE, READINGS);
    expectWellFormed(real({ temperature: 20 }), TIMELINE, READINGS);
  });

  it("warms gradually and finishes at the end readings", () => {
    const sim = real({ temperature: 80 });
    const temperature = series(sim, "temperature");
    expect(temperature[0]).toBe(20);
    expect(temperature[60]).toBeCloseTo(80, 9);
    for (let i = 1; i < temperature.length; i++) expect(temperature[i]).toBeGreaterThanOrEqual(temperature[i - 1]);
    // Not instant: a second in, the air is still well short of 80 °C.
    expect(temperature[times(sim).indexOf(1)]).toBeLessThan(75);
    expect(series(sim, "speed")[60]).toBeCloseTo(sim.readings["particles.speedRatio"], 9);
    expect(series(sim, "volume")[60]).toBeCloseTo(sim.readings["balloon.volumeRatio"], 9);
  });

  it("follows Charles's law and the speed rule at every moment", () => {
    const sim = real({ temperature: 90 });
    const temperature = series(sim, "temperature");
    const volume = series(sim, "volume");
    const speed = series(sim, "speed");
    expect(volume).toHaveLength(61);
    for (let i = 0; i < volume.length; i++) {
      expect(volume[i]).toBeCloseTo((temperature[i] + 273.15) / 293.15, 9);
      expect(speed[i]).toBeCloseTo(Math.sqrt(volume[i]), 9);
    }
    for (const s of series(sim, "size")) expect(s).toBe(1);
    for (const c of series(sim, "count")) expect(c).toBe(1);
  });
});

describe("heat stage: wrong models", () => {
  it("particles-expand: particles swell with the balloon and don't speed up", () => {
    const r = belief("particles-expand", { temperature: 80 }).readings;
    expect(r["particles.sizeRatio"]).toBeCloseTo(1.2047, 4);
    expect(r["particles.speedRatio"]).toBe(1);
    expect(r["particles.countRatio"]).toBe(1);
    expect(r["balloon.volumeRatio"]).toBeCloseTo(1.2047, 4);
  });

  it("heat-adds-particles: heating makes more particles, none faster", () => {
    const r = belief("heat-adds-particles", { temperature: 80 }).readings;
    expect(r["particles.countRatio"]).toBeCloseTo(1.2047, 4);
    expect(r["particles.speedRatio"]).toBe(1);
    expect(r["particles.sizeRatio"]).toBe(1);
    expect(r["balloon.volumeRatio"]).toBeCloseTo(1.2047, 4);
  });

  it("wrong models animate their belief frame by frame", () => {
    const expand = belief("particles-expand", { temperature: 90 });
    const adds = belief("heat-adds-particles", { temperature: 90 });
    expectWellFormed(expand, TIMELINE, READINGS);
    expectWellFormed(adds, TIMELINE, READINGS);
    const volume = series(expand, "volume");
    for (let i = 0; i < volume.length; i++) {
      expect(series(expand, "size")[i]).toBeCloseTo(volume[i], 9);
      expect(series(adds, "count")[i]).toBeCloseTo(volume[i], 9);
    }
    for (const s of series(expand, "speed")) expect(s).toBe(1);
    for (const s of series(adds, "speed")) expect(s).toBe(1);
  });
});
