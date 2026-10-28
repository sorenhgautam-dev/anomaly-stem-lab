import { describe, expect, it } from "vitest";
import { howSequence } from "./how-sequence";

// How it works plays the real LED experiment (DESIGN.md §7.1): every state is engine output.
describe("How it works sequence", () => {
  const { guess, steps } = howSequence();

  it("has the four beats, starting from the backwards LED and a guess of Glow", () => {
    expect(steps).toHaveLength(4);
    expect(guess).toBe("Glow");
    expect(steps[0]).toMatchObject({ flipped: true, slot: "resistor", run: null, verdict: null });
  });

  it("diagnoses: the real LED stays dark with no current, the belief's ghost glows", () => {
    expect(steps[1].run).toMatchObject({ lit: false, mA: 0, answer: "Stay dark" });
    expect(steps[1].ghost?.lit).toBe(true);
    expect(steps[1].verdict).toBe("wrong");
    expect(steps[1].tag).toBe("LEDs work either way round");
  });

  it("breaks the belief with the edit where it and reality disagree most", () => {
    expect(steps[2].run?.answer).not.toBe(steps[2].ghost?.answer);
  });

  it("rebuilds: turned round, the LED glows with a real current", () => {
    expect(steps[3]).toMatchObject({ flipped: false, slot: "resistor", verdict: "correct" });
    expect(steps[3].run?.lit).toBe(true);
    expect(steps[3].run?.mA).toBeGreaterThan(1);
  });
});
