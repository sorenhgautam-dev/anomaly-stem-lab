import { describe, expect, it } from "vitest";
import type { PropValue } from "../types";
import { burnWrongModels, simulateBurn } from "./burn";
import { buildWith, expectWellFormed, series, stageDef, times } from "./test-helpers";

/*
 * Expected numbers are worked out by hand. Steel wool (iron) burns to iron
 * oxide: 3Fe + 2O2 → Fe3O4, so each gram of iron takes in 64 / 167.5 = 0.382 g
 * of oxygen. In open air half the wool burns. The jar (with its lid) is 250 g.
 *   2 g open: 1 g of iron burns, takes in 0.382 g O2 → 252 g becomes 252.382 g
 *   1 L sealed jar holds 0.2787 g of O2 (enough for 0.730 g of iron); burning
 *   slows as the oxygen thins: 2 g burns 0.730 × (1 − e^(−1/0.730)) = 0.544 g of
 *   iron, using 0.208 g of the jar's O2 → reading stays 252 g
 *   belief "burning destroys matter": the 1 g of burned iron vanishes → 251 g
 */

const def = stageDef("burn", [
  { type: "toggle", id: "sealed", label: "Jar", onLabel: "Sealed", offLabel: "Open", initial: false },
  { type: "slider", id: "wool", label: "Steel wool", min: 1, max: 4, step: 0.5, unit: "g", initial: 2 },
]);

const real = (settings: Record<string, PropValue>) => simulateBurn(def, buildWith(def, settings));
const belief = (id: string, settings: Record<string, PropValue>) => burnWrongModels[id](def, buildWith(def, settings));

const TIMELINE = ["scale.grams", "glow", "oxide"];
const READINGS = ["scale.start", "scale.end", "oxygen.used"];

describe("burn stage: real model", () => {
  it("weighs the jar, its lid and the steel wool at the start", () => {
    expect(real({ sealed: false, wool: 2 }).readings["scale.start"]).toBeCloseTo(252, 9);
    expect(real({ sealed: true, wool: 3.5 }).readings["scale.start"]).toBeCloseTo(253.5, 9);
  });

  it("gets heavier in an open jar by the mass of oxygen taken from the air", () => {
    const r = real({ sealed: false, wool: 2 }).readings;
    expect(r["oxygen.used"]).toBeCloseTo(0.382, 3);
    expect(r["scale.end"]).toBeCloseTo(252.382, 3);
  });

  it("takes in twice the oxygen with twice the steel wool", () => {
    expect(real({ sealed: false, wool: 4 }).readings["oxygen.used"]).toBeCloseTo(0.764, 3);
  });

  it("keeps the same mass in a sealed jar, using the jar's own oxygen", () => {
    const r = real({ sealed: true, wool: 2 }).readings;
    expect(r["scale.end"]).toBeCloseTo(252, 9);
    expect(r["oxygen.used"]).toBeCloseTo(0.208, 3);
    // Never more than the 0.279 g of oxygen in a litre of air.
    expect(real({ sealed: true, wool: 4 }).readings["oxygen.used"]).toBeLessThan(0.279);
  });

  it("glows, then fades, and glows out sooner in a sealed jar as its oxygen thins", () => {
    const open = real({ sealed: false, wool: 2 });
    const sealed = real({ sealed: true, wool: 2 });
    const glow = series(open, "glow");
    expect(glow[0]).toBe(0);
    expect(Math.max(...glow)).toBeCloseTo(1, 6);
    expect(glow[60]).toBeLessThan(0.05);
    for (const g of [...glow, ...series(sealed, "glow")]) {
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
    }
    const i = times(open).indexOf(3);
    expect(series(sealed, "glow")[i]).toBeLessThan(glow[i]);
  });

  it("turns iron into oxide as it burns", () => {
    const open = series(real({ sealed: false, wool: 2 }), "oxide");
    expect(open[0]).toBe(0);
    expect(open[60]).toBeCloseTo(0.5, 6);
    for (let i = 1; i < open.length; i++) expect(open[i]).toBeGreaterThanOrEqual(open[i - 1]);
    // Sealed: 0.544 g of the 2 g.
    expect(series(real({ sealed: true, wool: 2 }), "oxide")[60]).toBeCloseTo(0.272, 3);
  });

  it("climbs on the open scale as the oxygen joins the iron, and holds steady when sealed", () => {
    const open = series(real({ sealed: false, wool: 2 }), "scale.grams");
    expect(open[0]).toBeCloseTo(252, 9);
    expect(open[60]).toBeCloseTo(252.382, 3);
    for (let i = 1; i < open.length; i++) expect(open[i]).toBeGreaterThanOrEqual(open[i - 1]);
    const sealed = series(real({ sealed: true, wool: 2 }), "scale.grams");
    expect(sealed).toHaveLength(61);
    for (const g of sealed) expect(g).toBeCloseTo(252, 9);
  });

  it("uses the experiment's starting settings when the build has none or they are unusable", () => {
    expect(real({}).readings["scale.end"]).toBeCloseTo(252.382, 3);
    expect(real({ sealed: "lid", wool: "a wad" }).readings).toEqual(real({ sealed: false, wool: 2 }).readings);
    const bare = stageDef("burn");
    expect(simulateBurn(bare, buildWith(bare, {})).readings).toEqual(real({ sealed: false, wool: 2 }).readings);
  });

  it("burns nothing when there is no steel wool", () => {
    const r = real({ sealed: false, wool: -3 }).readings;
    expect(r["scale.start"]).toBeCloseTo(250, 9);
    expect(r["scale.end"]).toBeCloseTo(250, 9);
    expect(r["oxygen.used"]).toBe(0);
  });

  it("returns a 61-frame timeline over 10 s with the UI's reading names", () => {
    expectWellFormed(real({ sealed: false, wool: 2 }), TIMELINE, READINGS);
    expectWellFormed(real({ sealed: true, wool: 4 }), TIMELINE, READINGS);
  });
});

describe("burn stage: wrong models", () => {
  it("burning-destroys-matter: the burned iron vanishes, open or sealed", () => {
    expect(belief("burning-destroys-matter", { sealed: false, wool: 2 }).readings["scale.end"]).toBeCloseTo(251, 3);
    expect(belief("burning-destroys-matter", { sealed: true, wool: 2 }).readings["scale.end"]).toBeCloseTo(251.456, 3);
  });

  it("oxygen-only-helps: oxygen helps it burn but adds nothing, so the mass stays put", () => {
    expect(belief("oxygen-only-helps", { sealed: false, wool: 2 }).readings["scale.end"]).toBeCloseTo(252, 9);
    expect(belief("oxygen-only-helps", { sealed: true, wool: 2 }).readings["scale.end"]).toBeCloseTo(252, 9);
  });

  it("wrong models animate their belief with the same timeline names", () => {
    for (const id of ["burning-destroys-matter", "oxygen-only-helps"]) {
      const sim = belief(id, { sealed: false, wool: 2 });
      expectWellFormed(sim, TIMELINE, READINGS);
      expect(series(sim, "scale.grams").at(-1)).toBeCloseTo(sim.readings["scale.end"], 9);
    }
  });
});
