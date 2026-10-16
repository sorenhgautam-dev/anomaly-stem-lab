import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { conflict } from "../conflict";
import { applyEdit, initialBuild } from "../edits";
import { simulateOutcome } from "../outcome";
import { realModel, wrongModel } from "../registry";
import { runExperiment } from "../run";
import { experimentSchema, hintSchema, misconceptionSchema, theorySchema } from "../schema";
import type { Build, ExperimentDef, Prediction, PropValue, Simulate } from "../types";

/*
 * Every chemistry content file is valid and plays end to end through the
 * real engine (registry → stage models → answer rules → diagnosis).
 */

const CONTENT = fileURLToPath(new URL("../../content/", import.meta.url));

function readJson(dir: string, id: string): unknown {
  return JSON.parse(readFileSync(join(CONTENT, dir, `${id}.json`), "utf8"));
}

const loadExperiment = (id: string): ExperimentDef => experimentSchema.parse(readJson("experiments", id));

/** The experiments the app imports by name, where they sit, and the settings each stage model reads. */
const EXPERIMENTS = [
  { id: "chemistry-melting", stage: "melt", level: "easy", order: 1, settings: ["power"] },
  { id: "chemistry-dissolving", stage: "dissolve", level: "easy", order: 2, settings: ["sugar"] },
  { id: "chemistry-sealed-bag", stage: "fizz", level: "easy", order: 3, settings: ["sealed", "soda"] },
  { id: "chemistry-indicator", stage: "indicator", level: "easy", order: 4, settings: ["liquid"] },
  { id: "chemistry-gas-heat", stage: "heat", level: "medium", order: 1, settings: ["temperature"] },
  { id: "chemistry-reaction-speed", stage: "rate", level: "medium", order: 2, settings: ["cold", "hot"] },
  { id: "chemistry-neutralisation", stage: "neutralise", level: "medium", order: 3, settings: ["base"] },
  { id: "chemistry-burning", stage: "burn", level: "medium", order: 4, settings: ["sealed", "wool"] },
  { id: "chemistry-gas-laws", stage: "gaslaw", level: "advanced", order: 1, settings: ["volume"] },
  { id: "chemistry-catalyst", stage: "catalyst", level: "advanced", order: 2, settings: ["catalyst"] },
  { id: "chemistry-equilibrium", stage: "equilibrium", level: "advanced", order: 3, settings: ["temperature"] },
];

const GRADES: Record<string, string> = { easy: "6-8", medium: "9-10", advanced: "11-12" };

const MISCONCEPTIONS = [
  "melting-temp-rises",
  "dissolved-means-gone",
  "gas-has-no-mass",
  "nothing-escapes",
  "harsh-means-acid",
  "food-cant-be-acid",
  "particles-expand",
  "heat-adds-particles",
  "temperature-doesnt-matter",
  "any-base-neutralises",
  "base-only-dilutes",
  "burning-destroys-matter",
  "oxygen-only-helps",
  "pressure-ignores-volume",
  "pressure-follows-volume",
  "catalyst-used-up",
  "equilibrium-is-frozen",
  "heat-pushes-forward",
];

const THEORY = [
  "changes-of-state",
  "dissolving",
  "conservation-of-mass",
  "acids-and-bases",
  "particles-and-heat",
  "reaction-rates",
  "neutralisation",
  "burning-and-mass",
  "gas-laws",
  "catalysts",
  "equilibrium",
];

const withSettings = (def: ExperimentDef, settings: Record<string, PropValue>): Build => {
  const start = initialBuild(def);
  return { ...start, settings: { ...start.settings, ...settings } };
};

const answer = (def: ExperimentDef, build: Build, model: Simulate): Prediction =>
  simulateOutcome(def, build, model).result;

describe("chemistry experiments", () => {
  it("validates every chemistry experiment file on disk", () => {
    const files = readdirSync(join(CONTENT, "experiments")).filter((f) => /^chemistry-.+\.json$/.test(f));
    for (const { id } of EXPERIMENTS) expect(files).toContain(`${id}.json`);
    for (const file of files) {
      const result = experimentSchema.safeParse(readJson("experiments", file.replace(/\.json$/, "")));
      expect(result.success, `${file}: ${result.success ? "" : result.error.message}`).toBe(true);
    }
  });

  it("numbers the experiments 1, 2, 3, … within each level", () => {
    for (const level of ["easy", "medium", "advanced"]) {
      const orders = EXPERIMENTS.filter((e) => e.level === level)
        .map((e) => loadExperiment(e.id).order)
        .sort((a, b) => a - b);
      expect(orders).toEqual(orders.map((_, i) => i + 1));
    }
  });

  describe.each(EXPERIMENTS)("$id", ({ id, stage, level, order, settings }) => {
    it("is a short chemistry experiment on its stage, level and grades, with one control per setting", () => {
      const def = loadExperiment(id);
      expect(def.id).toBe(id);
      expect(def.lab).toBe("chemistry");
      expect(def.stage).toBe(stage);
      expect(def.level).toBe(level);
      expect(def.grades).toBe(GRADES[level]);
      expect(def.order).toBe(order);
      expect(def.parts).toEqual([]);
      expect(def.outlines).toBe(false);
      expect(def.minutes).toBeGreaterThanOrEqual(2);
      expect(def.minutes).toBeLessThanOrEqual(4);
      expect(def.safety?.length ?? 0).toBeGreaterThan(0);
      expect((def.controls ?? []).map((c) => c.id).sort()).toEqual([...settings].sort());
      expect(def.prediction.type).toBe("choice");
    });

    it("starts every control on one of its own values", () => {
      for (const control of loadExperiment(id).controls ?? []) {
        if (control.type === "slider") {
          expect(control.initial).toBeGreaterThanOrEqual(control.min);
          expect(control.initial).toBeLessThanOrEqual(control.max);
          const steps = (control.initial - control.min) / control.step;
          expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9);
        }
        if (control.type === "choice") expect(control.options.map((o) => o.value)).toContain(control.initial);
      }
    });

    it("only offers edits the controls can show", () => {
      const def = loadExperiment(id);
      for (const { edit } of def.allowedEdits) {
        expect(edit.op).toBe("set");
        if (edit.op !== "set") continue;
        const control = def.controls?.find((c) => c.id === edit.setting);
        expect(control, `edit sets unknown setting "${edit.setting}"`).toBeDefined();
        if (control?.type === "toggle") expect(typeof edit.value).toBe("boolean");
        if (control?.type === "slider") {
          expect(typeof edit.value).toBe("number");
          expect(edit.value).toBeGreaterThanOrEqual(control.min);
          expect(edit.value).toBeLessThanOrEqual(control.max);
        }
        if (control?.type === "choice") expect(control.options.map((o) => o.value)).toContain(edit.value);
      }
    });

    it("runs its starting build, and exactly one option is the real answer", () => {
      const def = loadExperiment(id);
      const build = initialBuild(def);
      expect(def.prediction.type).toBe("choice");
      const options = def.prediction.type === "choice" ? def.prediction.options : [];
      const verdicts = options.map((value) => runExperiment(def, build, { type: "choice", value }, {}).verdict);
      expect(verdicts.filter((v) => v === "correct")).toHaveLength(1);
    });

    it("can catch each of its misconceptions in some build", () => {
      const def = loadExperiment(id);
      const start = initialBuild(def);
      const builds = [start, ...def.allowedEdits.map((e) => applyEdit(start, e.edit))];
      expect(def.misconceptions.length).toBeGreaterThan(0);
      for (const misconception of def.misconceptions) {
        const belief = wrongModel(misconception);
        expect(belief, `no wrong model for "${misconception}"`).toBeDefined();
        if (!belief) continue;
        const real = realModel(def.stage);
        const telling = builds.find((b) => answer(def, b, real).value !== answer(def, b, belief).value);
        expect(telling, `"${misconception}" never disagrees with reality`).toBeDefined();
        if (!telling) continue;
        // Predicting what the belief says is wrong, and diagnosis names the belief with a ghost to show.
        const run = runExperiment(def, telling, answer(def, telling, belief), {});
        expect(run.verdict).toBe("wrong");
        expect(run.diagnosis?.candidates).toContain(misconception);
        expect(run.diagnosis?.ghost?.timeline).toHaveLength(61);
      }
    });

    it("has a small change to suggest from the starting build for every misconception", () => {
      const def = loadExperiment(id);
      for (const misconception of def.misconceptions) {
        const suggestion = conflict(def, initialBuild(def), misconception);
        expect(suggestion, `no conflict edit for "${misconception}"`).not.toBeNull();
        expect(suggestion?.realAnswer).not.toEqual(suggestion?.beliefAnswer);
      }
    });

    it("links to theory, misconceptions and hints that exist", () => {
      const def = loadExperiment(id);
      expect(THEORY).toContain(def.theoryId);
      expect(existsSync(join(CONTENT, "theory", `${def.theoryId}.json`))).toBe(true);
      for (const misconception of def.misconceptions) {
        expect(MISCONCEPTIONS).toContain(misconception);
        expect(existsSync(join(CONTENT, "misconceptions", `${misconception}.json`))).toBe(true);
        expect(existsSync(join(CONTENT, "hints", `${misconception}.json`))).toBe(true);
      }
    });
  });

  it.each([
    // [experiment, settings changed from the start, real answer]
    ["chemistry-melting", {}, "Stay at 0 °C"],
    ["chemistry-melting", { power: 200 }, "Stay at 0 °C"],
    ["chemistry-melting", { power: 100 }, "Stay at 0 °C"],
    ["chemistry-dissolving", {}, "The same"],
    ["chemistry-dissolving", { sugar: 50 }, "The same"],
    ["chemistry-sealed-bag", {}, "Less"], // open bag: the gas leaves
    ["chemistry-sealed-bag", { sealed: true }, "The same"],
    ["chemistry-sealed-bag", { soda: 2 }, "Less"], // about 1 g of escaping gas still shows
    ["chemistry-indicator", {}, "Green or blue"], // soapy water is a base
    ["chemistry-indicator", { liquid: "lemon" }, "Pink or red"],
    ["chemistry-indicator", { liquid: "vinegar" }, "Pink or red"],
    ["chemistry-indicator", { liquid: "water" }, "Purple"],
    ["chemistry-indicator", { liquid: "baking-soda" }, "Green or blue"],
    ["chemistry-gas-heat", {}, "Faster"],
    ["chemistry-gas-heat", { temperature: 25 }, "Faster"], // a small warm-up still speeds them up
    ["chemistry-gas-heat", { temperature: 20 }, "No different"],
    ["chemistry-reaction-speed", {}, "Hot water"],
    ["chemistry-reaction-speed", { cold: 40, hot: 90 }, "Hot water"],
    ["chemistry-reaction-speed", { cold: 40, hot: 40 }, "Same time"],
    ["chemistry-neutralisation", {}, "Still acidic"],
    ["chemistry-neutralisation", { base: 24 }, "Still acidic"],
    ["chemistry-neutralisation", { base: 25 }, "Neutral"],
    ["chemistry-neutralisation", { base: 26 }, "Basic"],
    ["chemistry-neutralisation", { base: 35 }, "Basic"],
    ["chemistry-burning", {}, "More"], // open jar: oxygen joins the iron
    ["chemistry-burning", { sealed: true }, "The same"],
    ["chemistry-burning", { wool: 1 }, "More"],
    ["chemistry-gas-laws", {}, "Rise in proportion"], // half the volume, double the pressure
    ["chemistry-gas-laws", { volume: 20 }, "Rise in proportion"],
    ["chemistry-gas-laws", { volume: 60 }, "Stay the same"],
    ["chemistry-catalyst", {}, "All of it"],
    ["chemistry-catalyst", { catalyst: 2 }, "All of it"],
    ["chemistry-equilibrium", {}, "Darker brown"],
    ["chemistry-equilibrium", { temperature: 0 }, "Paler"],
    ["chemistry-equilibrium", { temperature: 20 }, "No change"],
  ] as [string, Record<string, PropValue>, string][])("%s with %o really answers %s", (id, settings, expected) => {
    const def = loadExperiment(id);
    expect(answer(def, withSettings(def, settings), realModel(def.stage))).toEqual({ type: "choice", value: expected });
  });

  it.each([
    // [experiment, misconception, settings changed from the start, what the belief answers]
    ["chemistry-melting", "melting-temp-rises", {}, "Keep rising"],
    ["chemistry-dissolving", "dissolved-means-gone", {}, "Less"],
    ["chemistry-sealed-bag", "gas-has-no-mass", { sealed: true }, "Less"],
    ["chemistry-sealed-bag", "nothing-escapes", {}, "The same"],
    ["chemistry-indicator", "harsh-means-acid", {}, "Pink or red"],
    ["chemistry-indicator", "food-cant-be-acid", { liquid: "lemon" }, "Purple"],
    ["chemistry-gas-heat", "particles-expand", {}, "Bigger"],
    ["chemistry-gas-heat", "heat-adds-particles", {}, "More of them"],
    ["chemistry-reaction-speed", "temperature-doesnt-matter", {}, "Same time"],
    ["chemistry-neutralisation", "any-base-neutralises", {}, "Neutral"],
    ["chemistry-neutralisation", "base-only-dilutes", { base: 35 }, "Still acidic"],
    ["chemistry-burning", "burning-destroys-matter", {}, "Less"],
    ["chemistry-burning", "oxygen-only-helps", {}, "The same"],
    ["chemistry-gas-laws", "pressure-ignores-volume", {}, "Stay the same"],
    ["chemistry-gas-laws", "pressure-follows-volume", {}, "Fall in proportion"],
    ["chemistry-catalyst", "catalyst-used-up", {}, "Some of it"],
    ["chemistry-catalyst", "catalyst-used-up", { catalyst: 2 }, "None of it"],
    ["chemistry-equilibrium", "equilibrium-is-frozen", {}, "No change"],
    ["chemistry-equilibrium", "heat-pushes-forward", {}, "Paler"],
  ] as [string, string, Record<string, PropValue>, string][])(
    "%s: %s with %o answers %s",
    (id, misconception, settings, expected) => {
      const def = loadExperiment(id);
      const belief = wrongModel(misconception);
      expect(belief).toBeDefined();
      if (!belief) return;
      expect(answer(def, withSettings(def, settings), belief)).toEqual({ type: "choice", value: expected });
    },
  );
});

describe("chemistry misconceptions, hints and theory", () => {
  it.each(MISCONCEPTIONS)("%s: has a valid misconception, a wrong model and a 3-step hint ladder", (id) => {
    const misconception = misconceptionSchema.parse(readJson("misconceptions", id));
    expect(misconception.id).toBe(id);
    expect(misconception.lab).toBe("chemistry");
    expect(misconception.conceptIds.length).toBeGreaterThan(0);
    expect(wrongModel(id)).toBeDefined();
    const hints = hintSchema.parse(readJson("hints", id));
    expect(hints.misconceptionId).toBe(id);
  });

  it.each(THEORY)("%s: has a valid, short theory page checked against sources", (id) => {
    const theory = theorySchema.parse(readJson("theory", id));
    expect(theory.id).toBe(id);
    expect(theory.body.length).toBeGreaterThanOrEqual(2);
    expect(theory.body.length).toBeLessThanOrEqual(4);
    expect(theory.sources?.length ?? 0).toBeGreaterThan(0);
  });
});
