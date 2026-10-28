import { describe, expect, it } from "vitest";
import { simulateCells, cellsWrongModels } from "@/engine/cancer/cells";
import { simulateChemo, chemoWrongModels } from "@/engine/cancer/chemo";
import { simulateTumour, tumourWrongModels } from "@/engine/cancer/tumour";
import { simulateUv, uvWrongModels } from "@/engine/cancer/uv";
import type { Build, ExperimentDef, PropValue } from "@/engine/types";
import { citation } from "@/lib/citations";
import { VALIDATION } from "@/lib/validation";

/*
 * Validation tests (CLAUDE.md §E): each teaching model behaves the way the
 * cited sources describe. The titles are shown on /science, so each one
 * says in a sentence what it proves.
 */

const def = { id: "test", controls: [] } as unknown as ExperimentDef;
const build = (settings: Record<string, PropValue> = {}): Build => ({ experimentId: "test", parts: [], connections: [], settings });
const last = <T,>(xs: T[]) => xs[xs.length - 1];

describe("Why chemo causes hair loss", () => {
  it("chemo affects fast-dividing cells (cancer and hair follicles) far more than slow-dividing cells", () => {
    const r = simulateChemo(def, build()).readings;
    expect(100 - r["hair.min"]).toBeGreaterThan(20);
    expect(100 - r["slow.min"]).toBeLessThan(3);
    expect(r["cancer.end"]).toBeLessThan(60);
  });
  it("healthy fast-dividing cells recover after treatment stops", () => {
    const r = simulateChemo(def, build({ length: "short" })).readings;
    expect(r["hair.end"]).toBeGreaterThan(r["hair.min"] + 15);
  });
  it("without chemo, the hair follicle cells stay where they started", () => {
    const r = simulateChemo(def, build({ chemo: false })).readings;
    expect(Math.abs(100 - r["hair.min"])).toBeLessThan(0.5);
  });
  it("a slow-dividing cancer is affected less than a fast-dividing one", () => {
    const fast = simulateChemo(def, build({ cancerRate: "fast" })).readings["cancer.end"];
    const slow = simulateChemo(def, build({ cancerRate: "slow" })).readings["cancer.end"];
    expect(slow).toBeGreaterThan(fast);
  });
  it("the wrong idea 'chemo only touches cancer' leaves the hair cells untouched", () => {
    const r = chemoWrongModels["chemo-targets-only-cancer"](def, build()).readings;
    expect(r["hair.early"]).toBe(0);
    expect(Math.abs(100 - r["hair.min"])).toBeLessThan(0.5);
  });
});

describe("How tumours grow", () => {
  it("doubling gives exponential growth: each doubling adds as many cells as all the doublings before it", () => {
    const tl = simulateTumour(def, build({ doubling: 2, months: 30 })).timeline!;
    const cells = tl.map((f) => f.values.cells);
    const first = cells[0];
    expect(last(cells)).toBeCloseTo(first * 2 ** 15, 3);
  });
  it("a doubling cluster stays tiny for a long time, then grows fast", () => {
    const r = simulateTumour(def, build({ doubling: 2, months: 30 })).readings;
    expect(r["growth.ratio"]).toBeGreaterThan(100);
  });
  it("the wrong idea 'it grows steadily' adds the same amount in each half", () => {
    const r = tumourWrongModels["tumour-grows-steadily"](def, build()).readings;
    expect(r["growth.ratio"]).toBeCloseTo(1, 6);
  });
});

describe("Cells out of control", () => {
  it("crowded normal cells stop dividing once the dish is full", () => {
    const r = simulateCells(def, build({ scene: "fill" })).readings;
    expect(r["normal.end"]).toBeLessThanOrEqual(r["normal.room"]);
    expect(r["normal.afterFull"]).toBeLessThan(r["normal.room"] * 0.05);
  });
  it("cancer cells ignore the stop signal and keep dividing past the dish's room", () => {
    const r = simulateCells(def, build({ scene: "fill" })).readings;
    expect(r["cancer.count"]).toBeGreaterThan(r["normal.room"] * 2);
  });
  it("in the contact test nothing crosses to the other dish: cancer isn't caught", () => {
    const short = simulateCells(def, build({ scene: "contact" })).readings;
    const long = simulateCells(def, build({ scene: "contact", touch: "long" })).readings;
    expect(short["spread.end"]).toBe(0);
    expect(long["spread.end"]).toBe(0);
  });
  it("the wrong idea 'cancer is catching' sends cells across at once", () => {
    expect(cellsWrongModels["cancer-is-contagious"](def, build({ scene: "contact" })).readings["spread.early"]).toBeGreaterThan(0);
  });
});

describe("UV on a cloudy day", () => {
  it("cloud cover reduces UV but never removes it", () => {
    for (const cloud of [0, 30, 60, 100]) {
      const share = simulateUv(def, build({ cloud })).readings["uv.share"];
      expect(share).toBeGreaterThan(0.25);
      expect(share).toBeLessThanOrEqual(1);
    }
  });
  it("ordinary cloud lets over 90% of the UV through, and even full cover lets most through", () => {
    expect(simulateUv(def, build({ cloud: 60 })).readings["uv.share"]).toBeGreaterThan(0.9);
    expect(simulateUv(def, build({ cloud: 100 })).readings["uv.share"]).toBeGreaterThan(0.6);
  });
  it("damage to skin cells adds up with time in the UV", () => {
    const short = simulateUv(def, build({ minutes: 30 })).readings["damage.end"];
    const long = simulateUv(def, build({ minutes: 90 })).readings["damage.end"];
    expect(long).toBeCloseTo(short * 3, 6);
    const tl = simulateUv(def, build()).timeline!.map((f) => f.values.damage);
    for (let i = 1; i < tl.length; i++) expect(tl[i]).toBeGreaterThanOrEqual(tl[i - 1]);
  });
  it("sun protection cuts the damage", () => {
    const bare = simulateUv(def, build()).readings["damage.end"];
    const covered = simulateUv(def, build({ protection: true })).readings["damage.end"];
    expect(covered).toBeLessThan(bare / 2);
  });
  it("the wrong idea 'clouds block UV' lets almost none through", () => {
    expect(uvWrongModels["clouds-block-uv"](def, build({ cloud: 60 })).readings["uv.share"]).toBeLessThan(0.2);
  });
});

describe("the validation results /science shows", () => {
  it.each(VALIDATION.map((c) => [c.title, c] as const))("%s", (_title, c) => {
    expect(c.run()).toBe(true);
    for (const id of c.citations) expect(citation(id), `${id} is in content/citations.json`).toBeDefined();
  });
});
