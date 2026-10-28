import { describe, expect, it } from "vitest";
import anoLines from "@/content/ano-lines.json";
import { hintsFor } from "@/lib/content";
import { bestWritten, offlineAnswer, writtenHint } from "./hints";

const CHEMO = "treatment-chemo-hair";
const FOCUS = "chemo-targets-only-cancer";

describe("Ask Ano without the model: the lab's own words", () => {
  it("answers a science question with the closest written line from this experiment", () => {
    const line = bestWritten(CHEMO, "Why does hair fall out?", FOCUS, 0);
    expect(line).toMatch(/hair/i);
    expect(line).toMatch(/fall out/i);
  });

  it("falls back to the next hint when nothing matches", () => {
    expect(bestWritten(CHEMO, "zzz qqq", FOCUS, 1)).toBe(writtenHint(FOCUS, 1));
    expect(hintsFor(FOCUS)?.hints).toContain(bestWritten(CHEMO, "zzz qqq", FOCUS, 1));
  });

  it("starts with the honest note, and never comes back empty, even for an unknown experiment", () => {
    expect(offlineAnswer(CHEMO, "How does chemo work?", FOCUS, 0).startsWith(anoLines.liveOff[0])).toBe(true);
    expect(offlineAnswer("", "?", null, 0).length).toBeGreaterThan(anoLines.liveOff[0].length);
  });
});
