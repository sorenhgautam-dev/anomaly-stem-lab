import { describe, expect, it } from "vitest";
import type { PropValue } from "../types";
import { meltWrongModels, simulateMelt } from "./melt";
import { buildWith, expectWellFormed, series, stageDef, times } from "./test-helpers";

/*
 * Expected numbers are worked out by hand. 100 g of ice at −10 °C, heated at a
 * steady power for 380 s (ice 2.09 J/g·°C, water 4.18 J/g·°C, melting 334 J/g):
 *   warm the ice to 0 °C: 2 090 J   melt it: 33 400 J
 *   150 W: melting from 13.9 s to 236.6 s, water ends at (57 000 − 35 490) / 418 = 51.46 °C
 *   100 W: water ends at 6.00 °C     200 W: 96.91 °C
 *   display t = 3 s is 114 s in: (114 − 13.93) × 150 / 33 400 = 0.449 melted → 0.551 solid
 *   particle speed ratio at 0 °C vs −10 °C: √(273.15 / 263.15) = 1.0188
 *   belief (thermometer climbs straight from 0 °C at 13.9 s to 51.46 °C at 380 s):
 *     rises 51.46 × 222.7 / 366.1 = 31.30 °C while melting, average 15.65 °C
 */

const def = stageDef("melt", [
  { type: "slider", id: "power", label: "Heater power", min: 100, max: 200, step: 10, unit: "W", initial: 150 },
]);

const real = (settings: Record<string, PropValue>) => simulateMelt(def, buildWith(def, settings));
const rises = (settings: Record<string, PropValue>) =>
  meltWrongModels["melting-temp-rises"](def, buildWith(def, settings));

const TIMELINE = ["temperature", "solid", "speed", "order", "clock"];
const READINGS = ["temp.start", "temp.duringMelt", "temp.meltChange", "temp.end", "melt.fraction"];

describe("melt stage: real model", () => {
  it("holds the thermometer at 0 °C the whole time the ice is melting", () => {
    for (const power of [100, 150, 200]) {
      const r = real({ power }).readings;
      expect(r["temp.duringMelt"]).toBeCloseTo(0, 9);
      expect(r["temp.meltChange"]).toBeCloseTo(0, 9);
    }
  });

  it("starts from ice at −10 °C and warms the meltwater once the ice is gone", () => {
    expect(real({ power: 150 }).readings["temp.start"]).toBe(-10);
    expect(real({ power: 150 }).readings["temp.end"]).toBeCloseTo(51.46, 2);
    expect(real({ power: 100 }).readings["temp.end"]).toBeCloseTo(6.0, 2);
    expect(real({ power: 200 }).readings["temp.end"]).toBeCloseTo(96.91, 2);
  });

  it("melts all the ice at every power on the slider", () => {
    for (const power of [100, 150, 200]) expect(real({ power }).readings["melt.fraction"]).toBeCloseTo(1, 9);
  });

  it("melts at the rate the heater supplies 334 J per gram", () => {
    const sim = real({ power: 150 });
    const i = times(sim).indexOf(3);
    expect(series(sim, "solid")[i]).toBeCloseTo(0.551, 3);
    expect(series(sim, "temperature")[i]).toBe(0);
  });

  it("melts faster with more power, yet still pauses at 0 °C", () => {
    const fast = real({ power: 200 });
    const slow = real({ power: 100 });
    const i = times(fast).indexOf(3);
    expect(series(fast, "solid")[i]).toBeLessThan(series(slow, "solid")[i]);
    expect(series(slow, "temperature")[i]).toBe(0);
  });

  it("warms the ice first, pauses while melting, then warms the water", () => {
    const sim = real({ power: 150 });
    const temperature = series(sim, "temperature");
    const solid = series(sim, "solid");
    expect(temperature[0]).toBe(-10);
    expect(solid[0]).toBe(1);
    for (let i = 1; i < temperature.length; i++) {
      expect(temperature[i]).toBeGreaterThanOrEqual(temperature[i - 1]);
      expect(solid[i]).toBeLessThanOrEqual(solid[i - 1]);
      // While there is ice and water together, the thermometer reads 0 °C.
      if (solid[i] > 0 && solid[i] < 1) expect(temperature[i]).toBe(0);
    }
    expect(temperature[60]).toBeCloseTo(51.46, 2);
    expect(solid[60]).toBe(0);
  });

  it("keeps the particles' speed steady while melting, then speeds them up", () => {
    const sim = real({ power: 150 });
    const i = times(sim).indexOf(3);
    expect(series(sim, "speed")[0]).toBe(1);
    expect(series(sim, "speed")[i]).toBeCloseTo(1.0188, 4);
    // √((51.46 + 273.15) / 263.15) = 1.1107
    expect(series(sim, "speed")[60]).toBeCloseTo(1.1107, 3);
  });

  it("loosens the ordered lattice exactly as the ice melts", () => {
    const sim = real({ power: 120 });
    const order = series(sim, "order");
    expect(order).toHaveLength(61);
    expect(order[0]).toBe(1);
    expect(order[60]).toBe(0);
    expect(order).toEqual(series(sim, "solid"));
  });

  it("runs the clock in real seconds: 380 s of heating over the 10 s run", () => {
    const sim = real({ power: 150 });
    const clock = series(sim, "clock");
    expect(clock[0]).toBe(0);
    expect(clock[60]).toBeCloseTo(380, 9);
  });

  it("uses the experiment's starting settings when the build has none or they are unusable", () => {
    expect(real({}).readings["temp.end"]).toBeCloseTo(51.46, 2);
    expect(real({ power: "max" }).readings).toEqual(real({ power: 150 }).readings);
    const bare = stageDef("melt");
    expect(simulateMelt(bare, buildWith(bare, {})).readings).toEqual(real({ power: 150 }).readings);
  });

  it("keeps the heater within the 100–200 W the model covers (no boiling, the ice always melts)", () => {
    expect(real({ power: 5000 }).readings).toEqual(real({ power: 200 }).readings);
    expect(real({ power: -20 }).readings).toEqual(real({ power: 100 }).readings);
    expect(real({ power: 5000 }).readings["temp.end"]).toBeLessThan(100);
  });

  it("returns a 61-frame timeline over 10 s with the UI's reading names", () => {
    expectWellFormed(real({ power: 150 }), TIMELINE, READINGS);
    expectWellFormed(real({ power: 100 }), TIMELINE, READINGS);
  });
});

describe("melt stage: wrong model", () => {
  it("melting-temp-rises: the thermometer keeps climbing while the ice melts", () => {
    const r = rises({ power: 150 }).readings;
    expect(r["temp.meltChange"]).toBeCloseTo(31.3, 1);
    expect(r["temp.duringMelt"]).toBeCloseTo(15.65, 1);
    expect(rises({ power: 100 }).readings["temp.meltChange"]).toBeCloseTo(5.585, 2);
  });

  it("melting-temp-rises: same start, same finish, no pause in between", () => {
    const sim = rises({ power: 150 });
    expectWellFormed(sim, TIMELINE, READINGS);
    expect(sim.readings["temp.start"]).toBe(-10);
    expect(sim.readings["temp.end"]).toBeCloseTo(51.46, 2);
    const temperature = series(sim, "temperature");
    for (let i = 3; i < temperature.length; i++) expect(temperature[i]).toBeGreaterThan(temperature[i - 1]);
    // The ice still melts at the same pace; only the thermometer differs.
    expect(series(sim, "solid")).toEqual(series(real({ power: 150 }), "solid"));
  });
});
