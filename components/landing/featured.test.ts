import { describe, expect, it } from "vitest";
import { initialBuild } from "@/engine/edits";
import { simulateOutcome } from "@/engine/outcome";
import { realModel } from "@/engine/registry";
import { getExperiment } from "@/lib/content";
import { featuredCards, SLIDES } from "./featured";

// The hero's cards come from the simulator, not from written values (DESIGN.md §0).
describe("featured hero cards: the three cancer experiments", () => {
  const cards = featuredCards();

  it("has the chemo, tumour and cells slides, in that order (CLAUDE.md §3 hero slides)", () => {
    expect(SLIDES.map((s) => s.run.experiment)).toEqual(["treatment-chemo-hair", "detection-tumour-growth", "cell-out-of-control"]);
    for (const s of SLIDES) expect(getExperiment(s.run.experiment)?.heroSlide).toBe(SLIDES.indexOf(s) + 1);
  });

  it.each(SLIDES.map((s, i) => [s.id, s, i] as const))("%s: the reality row and the stage number are the simulator's", (_id, slide, i) => {
    const def = getExperiment(slide.run.experiment)!;
    const real = simulateOutcome(def, initialBuild(def), realModel(def.stage));
    const answer = String(real.result.value);
    expect(cards[i].result.reality).toBe(slide.answers[answer] ?? answer);
    expect(cards[i].result.status).toBe(answer === slide.run.guess ? "verified" : "anomaly");
    expect(cards[i].stage?.value).toBe(Math.round(real.readings[slide.run.reading.key] * 10 ** slide.run.reading.digits) / 10 ** slide.run.reading.digits);
    expect(cards[i].href).toBe(`/labs/${def.lab}/${def.level}/${def.id}`);
  });
});
