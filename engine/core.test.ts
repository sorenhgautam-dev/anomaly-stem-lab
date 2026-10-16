import { describe, expect, it } from "vitest";
import { applyEdit, initialBuild, sameBuild } from "./edits";
import { matches } from "./match";
import { answerFor, holds } from "./rules";
import { experimentSchema } from "./schema";
import type { ExperimentDef, Simulation } from "./types";

const sim = (readings: Record<string, number>, faults: string[] = []): Simulation => ({ readings, faults });

const def: ExperimentDef = {
  id: "robotics-test-01",
  lab: "robotics",
  level: "easy",
  grades: "6-8",
  order: 1,
  title: "Test",
  goal: "Light the bulb.",
  intro: "Let's test.",
  minutes: 2,
  stage: "circuit",
  parts: ["bulb", "wire"],
  outlines: true,
  board: {
    slots: [
      { id: "batt", label: "Battery", x: 200, y: 300, orientation: "v", accepts: [], fixed: { kind: "battery", props: { volts: 6 } } },
      { id: "bulb", label: "Bulb", x: 600, y: 300, orientation: "v", accepts: ["bulb"], initial: { kind: "bulb" } },
    ],
    wires: [
      { from: "batt.a", to: "bulb.a" },
      { from: "batt.b", to: "bulb.b" },
    ],
  },
  prediction: { type: "choice", question: "Will it light?", options: ["Yes", "No"] },
  answer: { kind: "cases", cases: [{ when: { reading: "bulb.lit", op: "==", value: 1 }, answer: "Yes" }], otherwise: "No" },
  misconceptions: [],
  allowedEdits: [{ id: "remove-bulb", label: "Take the bulb out", edit: { op: "remove", slot: "bulb" } }],
  theoryId: "test",
};

describe("rules", () => {
  it("evaluates nested conditions and faults", () => {
    const s = sim({ "led.lit": 1, "led.current": 0.02 }, ["burnout:led"]);
    expect(holds({ all: [{ reading: "led.lit", op: "==", value: 1 }, { fault: "burnout:led" }] }, s)).toBe(true);
    expect(holds({ not: { fault: "short-circuit" } }, s)).toBe(true);
    expect(holds({ any: [{ reading: "led.current", op: ">", value: 1 }, { fault: "x" }] }, s)).toBe(false);
    expect(holds({ reading: "missing", op: "==", value: 0 }, s)).toBe(true);
  });

  it("answers cases, compare, change and value rules", () => {
    expect(answerFor(def.answer, sim({ "bulb.lit": 1 }), null)).toEqual({ type: "choice", value: "Yes" });
    const compare = { kind: "compare", a: "a", b: "b", tolerance: 0.05, aBigger: "A", bBigger: "B", same: "Same" } as const;
    expect(answerFor(compare, sim({ a: 1, b: 1.02 }), null).value).toBe("Same");
    expect(answerFor(compare, sim({ a: 1, b: 0.5 }), null).value).toBe("A");
    const change = { kind: "change", reading: "x", tolerance: 0.1, up: "Up", down: "Down", same: "Same", zero: "Off" } as const;
    expect(answerFor(change, sim({ x: 2 }), sim({ x: 1 })).value).toBe("Up");
    expect(answerFor(change, sim({ x: 0.97 }), sim({ x: 1 })).value).toBe("Same");
    expect(answerFor(change, sim({ x: 0 }), sim({ x: 1 })).value).toBe("Off");
    expect(answerFor({ kind: "value", reading: "g" }, sim({ g: 182.4 }), null)).toEqual({ type: "slider", value: 182.4 });
  });

  it("matches choices exactly and sliders within tolerance", () => {
    const slider = { type: "slider", question: "?", min: 0, max: 10, step: 1, tolerance: 0.5 } as const;
    expect(matches(slider, { type: "slider", value: 5 }, { type: "slider", value: 5.4 })).toBe(true);
    expect(matches(slider, { type: "slider", value: 5 }, { type: "slider", value: 5.6 })).toBe(false);
    expect(matches(def.prediction, { type: "choice", value: "No" }, { type: "choice", value: "Yes" })).toBe(false);
  });
});

describe("edits", () => {
  it("builds the starting build from fixed and initial parts", () => {
    const build = initialBuild(def);
    expect(build.parts.map((p) => p.slot).sort()).toEqual(["batt", "bulb"]);
    expect(build.connections).toHaveLength(2);
  });

  it("applies edits immutably", () => {
    const build = initialBuild(def);
    const removed = applyEdit(build, { op: "remove", slot: "bulb" });
    expect(removed.parts).toHaveLength(1);
    expect(build.parts).toHaveLength(2);
    const wired = applyEdit(build, { op: "connect", from: "bulb.a", to: "bulb.b" });
    expect(wired.connections).toHaveLength(3);
    expect(sameBuild(applyEdit(wired, { op: "disconnect", from: "bulb.b", to: "bulb.a" }), build)).toBe(true);
  });
});

describe("schema", () => {
  it("accepts a valid experiment", () => {
    expect(experimentSchema.safeParse(def).success).toBe(true);
  });

  it("rejects answers that aren't options and wires to unknown slots", () => {
    const bad = {
      ...def,
      answer: { kind: "cases", cases: [{ when: { fault: "x" }, answer: "Maybe" }], otherwise: "No" },
      board: { ...def.board!, wires: [{ from: "nope.a", to: "bulb.b" }] },
    };
    const result = experimentSchema.safeParse(bad);
    expect(result.success).toBe(false);
    const messages = result.success ? [] : result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes('"Maybe"'))).toBe(true);
    expect(messages.some((m) => m.includes("unknown slot"))).toBe(true);
  });
});
