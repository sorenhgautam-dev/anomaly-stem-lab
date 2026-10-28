import { describe, expect, it, beforeEach } from "vitest";
import { calibrationLine, calibrationNudge, rightPercent } from "@/lib/calibration";
import { useProgress } from "@/lib/progress";
import { formatReadout, type Readout } from "@/lib/readout";

// No IndexedDB in node: progress lasts for the test, which is what's checked.
beforeEach(() => useProgress.getState().reset());

describe("calibration from saved runs", () => {
  it("starts empty with no made-up numbers", () => {
    const { calls } = useProgress.getState();
    expect(rightPercent(calls.certain)).toBeNull();
    expect(calibrationLine(calls)).toMatch(/^Pick “Certain”/);
    expect(calibrationNudge(calls)).toBeNull();
  });

  it("tallies each confidence setting separately", () => {
    const p = useProgress.getState();
    p.recordRun("chemistry-melting", false, null, "melting-temp-rises", "certain");
    p.recordRun("chemistry-melting", true, null, null, "certain");
    p.recordRun("chemistry-sealed-bag", true, null, null, "guess");
    const { calls } = useProgress.getState();
    expect(calls).toEqual({ certain: { right: 1, total: 2 }, fairly: { right: 0, total: 0 }, guess: { right: 1, total: 1 } });
    expect(calibrationLine(calls)).toBe("When you were sure, you were right 1 of 2 times.");
  });

  it("only nudges after three sure guesses", () => {
    const p = useProgress.getState();
    for (let i = 0; i < 3; i++) p.recordRun("chemistry-melting", true, null, null, "certain");
    expect(calibrationNudge(useProgress.getState().calls)).toBe("Your sure guesses are usually right. Nice!");
  });
});

describe("busting a belief", () => {
  it("reports a belief as newly busted once, the first time", () => {
    const p = useProgress.getState();
    expect(p.recordRun("chemistry-melting", false, { "melting-temp-rises": 1 }, "melting-temp-rises", "fairly")).toEqual([]);
    expect(useProgress.getState().recordRun("chemistry-melting", true, null, null, "fairly")).toEqual(["melting-temp-rises"]);
    expect(useProgress.getState().recordRun("chemistry-melting", true, null, null, "fairly")).toEqual([]);
  });
});

describe("formatReadout", () => {
  const r = (extra: Partial<Readout> = {}): Readout => ({ key: "k", label: "L", name: "n", unit: "°C", digits: 1, ...extra });
  it("rounds, scales and adds units", () => {
    expect(formatReadout(2.456, r())).toBe("2.5 °C");
    expect(formatReadout(0.245, r({ unit: "%", digits: 0, scale: 100 }))).toBe("25%");
    expect(formatReadout(1.098, r({ unit: "×", digits: 2 }))).toBe("1.10×");
    expect(formatReadout(7, r({ unit: "", digits: 1 }))).toBe("7.0");
  });
  it("never shows a minus zero", () => {
    expect(formatReadout(-0.01, r())).toBe("0.0 °C");
  });
  it("turns signs into words when asked", () => {
    expect(formatReadout(-45.2, r({ unit: "°", digits: 0, signWords: ["left", "right"] }))).toBe("45° right");
    expect(formatReadout(190.9, r({ unit: "°", digits: 0, signWords: ["left", "right"] }))).toBe("191° left");
    expect(formatReadout(-16, r({ unit: "°", digits: 0, abs: true }))).toBe("16°");
  });
  it("says so when there's no reading", () => {
    expect(formatReadout(Number.NaN, r())).toBe("no reading");
  });
});
