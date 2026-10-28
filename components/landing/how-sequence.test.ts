import { describe, expect, it } from "vitest";
import { initialBuild } from "@/engine/edits";
import { simulateOutcome } from "@/engine/outcome";
import { realModel } from "@/engine/registry";
import { getExperiment } from "@/lib/content";
import { howSequence } from "./how-sequence";

describe("How it works: the real chemo experiment, step by step", () => {
  const seq = howSequence();
  const def = getExperiment("treatment-chemo-hair")!;
  const real = simulateOutcome(def, initialBuild(def), realModel(def.stage));

  it("has four steps: guess, run, reveal, understand", () => {
    expect(seq.steps).toHaveLength(4);
    expect(seq.question).toBe(def.prediction.type === "choice" ? def.prediction.question : "");
  });
  it("starts with full dishes and the common wrong guess", () => {
    expect(seq.steps[0].dishes).toEqual({ cancer: 100, hair: 100, slow: 100 });
    expect(seq.guess).toBe("Nothing happens to them");
  });
  it("reveals the simulator's answer, a wrong verdict, and the hair dish at its lowest", () => {
    const reveal = seq.steps[2];
    expect(reveal.verdict).toBe("wrong");
    expect(reveal.run?.answer).toBe(real.result.value);
    expect(reveal.dishes.hair).toBeCloseTo(Math.min(...real.timeline!.map((f) => f.values.hair)), 6);
    // The guess's idea: the hair cells untouched.
    expect(reveal.ghostHair).toBeCloseTo(100, 3);
  });
  it("ends with the hair cells refilling after treatment", () => {
    expect(seq.steps[3].dishes.hair).toBeGreaterThan(seq.steps[2].dishes.hair);
    expect(seq.steps[3].dishes.slow).toBeGreaterThan(95);
  });
  it("judges any guess with the simulator: the right one is right, with no ghost", () => {
    const right = howSequence(String(real.result.value));
    expect(right.right).toBe(true);
    expect(right.steps[2].verdict).toBe("correct");
    expect(right.steps[2].ghostHair).toBeNull();
    for (const option of seq.options.filter((o) => o !== real.result.value)) expect(howSequence(option).steps[2].verdict).toBe("wrong");
  });
});
