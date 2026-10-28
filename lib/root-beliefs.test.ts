import { describe, expect, it } from "vitest";
import { allMisconceptions } from "@/lib/content";
import { findRoots, ROOT_AFTER, ROOT_BELIEFS, rootFor, rootLine, rootMatchFor, wrongGuesses } from "@/lib/root-beliefs";

const ids = new Set(allMisconceptions().map((m) => m.id));
const CHEMO = "treatment-chemo-hair";

describe("root belief catalogue", () => {
  it("has the five root beliefs of the cancer catalogue (CLAUDE.md §3)", () => {
    expect(ROOT_BELIEFS.map((r) => r.id).sort()).toEqual(["cancer-happens-suddenly", "cancer-is-something-you-catch", "if-i-cant-see-it-it-isnt-there", "its-all-decided-at-birth", "treatment-only-touches-the-cancer"]);
  });

  it("only names misconceptions that exist", () => {
    for (const root of ROOT_BELIEFS) for (const id of root.misconceptions) expect(ids.has(id), `${root.id}: ${id}`).toBe(true);
  });

  it("puts each misconception under at most one root", () => {
    const seen = ROOT_BELIEFS.flatMap((r) => r.misconceptions);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("writes every idea in plain words: no em dashes, lower-case start, no full stop (it ends Ano's sentence)", () => {
    for (const root of ROOT_BELIEFS) {
      expect(`${root.plainWords}${root.title}${root.anoLine}`).not.toMatch(/—/);
      expect(root.plainWords[0]).toBe(root.plainWords[0].toLowerCase());
      expect(root.plainWords.endsWith(".")).toBe(false);
    }
  });
});

describe("findRoots", () => {
  it("finds nothing with no wrong guesses", () => {
    expect(findRoots({})).toEqual([]);
    expect(wrongGuesses({})).toEqual([]);
  });

  it("finds nothing with one wrong guess", () => {
    expect(findRoots({ [CHEMO]: ["chemo-targets-only-cancer"] })).toEqual([]);
  });

  it(`calls it out at ${ROOT_AFTER} different wrong guesses from one root`, () => {
    const [match] = findRoots({ [CHEMO]: ["chemo-targets-only-cancer", "chemo-hits-healthy-last"] });
    expect(match.root.id).toBe("treatment-only-touches-the-cancer");
    expect(match.guesses).toHaveLength(2);
    expect(match.experimentIds).toEqual([CHEMO]);
    expect(rootLine(match)).toBe("Two of your wrong guesses come from the same idea: treatment only touches the cancer cells.");
  });

  it("counts the same guess repeated in one experiment once", () => {
    expect(findRoots({ [CHEMO]: ["chemo-targets-only-cancer", "chemo-targets-only-cancer"] })).toEqual([]);
  });

  it("uses digits past ten", () => {
    const match = { root: ROOT_BELIEFS[0], guesses: Array.from({ length: 12 }, () => ({ experimentId: "x", misconceptionId: "y" })), experimentIds: [] };
    expect(rootLine(match)).toMatch(/^12 of your wrong guesses/);
  });

  it("skips saved experiments that no longer exist, but still counts the guess", () => {
    const [match] = findRoots({ [CHEMO]: ["chemo-targets-only-cancer"], "treatment-gone": ["chemo-hits-healthy-last"] });
    expect(match.experimentIds).toEqual([CHEMO]);
  });

  it("matches a just-diagnosed idea to its root only once it's a pattern", () => {
    expect(rootMatchFor("chemo-targets-only-cancer", { [CHEMO]: ["chemo-targets-only-cancer"] })).toBeNull();
    expect(rootMatchFor(null, {})).toBeNull();
    expect(rootMatchFor("chemo-hits-healthy-last", { [CHEMO]: ["chemo-targets-only-cancer", "chemo-hits-healthy-last"] })?.root.id).toBe("treatment-only-touches-the-cancer");
    expect(rootFor("melting-temp-rises")).toBeUndefined();
  });
});
