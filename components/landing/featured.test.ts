import { describe, expect, it } from "vitest";
import { getExperiment, misconceptionText } from "@/lib/content";
import { featuredCards } from "./featured";

// The hero's cards come from the simulator, not from written values (DESIGN.md §0).
describe("featured hero cards", () => {
  const [gravity, led, bag] = featuredCards();

  it("judges the drop teaser with its own model: the same-time guess is verified", () => {
    expect(gravity.result.prediction).toBe("Same time");
    expect(gravity.result.reality).toBe("Same time");
    expect(gravity.result.status).toBe("verified");
  });

  it("runs the backwards LED through the circuit solver: dark, no current, an anomaly", () => {
    expect(led.result.reality).toMatch(/^Stay dark · 0 mA$/);
    expect(led.result.status).toBe("anomaly");
    // The belief is the misconception the engine diagnoses from "Glow".
    const options = getExperiment("robotics-led")!.misconceptions.map((id) => misconceptionText(id)!.title);
    expect(options).toContain(led.belief.title);
  });

  it("runs the sealed bag through the fizz model: the reading doesn't change", () => {
    expect(bag.result.reality).toMatch(/^Stays the same · \d+(\.\d)? g$/);
    expect(bag.result.status).toBe("anomaly");
    const options = getExperiment("chemistry-sealed-bag")!.misconceptions.map((id) => misconceptionText(id)!.title);
    expect(options).toContain(bag.belief.title);
  });
});
