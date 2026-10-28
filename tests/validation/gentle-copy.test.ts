import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Gentle and kid-friendly copy (CLAUDE.md §5, GAUNTLET.md G7): every string
 * a student reads in the cancer labs is scanned for scary or graphic words,
 * survival talk, blame, emojis and em dashes, and every sentence is kept
 * short. Source quotes in content/citations.json are the sources' own words
 * and are checked by the slop scan instead.
 */

const CANCER_LABS = new Set(["cell", "prevention", "detection", "treatment"]);
const root = join(__dirname, "..", "..", "content");
const read = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8"));

/** Every string inside a JSON value, with where it came from. */
function strings(value: unknown, where: string, out: [string, string][] = []): [string, string][] {
  if (typeof value === "string") out.push([where, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${where}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) if (!["id", "stage", "theoryId", "misconceptionId", "rootBeliefId", "lab", "level", "grades", "conceptIds", "citationIds", "misconceptions", "setting", "op", "reading", "value"].includes(k)) strings(v, `${where}.${k}`, out);
  return out;
}

function cancerCopy(): [string, string][] {
  const out: [string, string][] = [];
  const experiments = readdirSync(join(root, "experiments")).map((f) => read(`experiments/${f}`)).filter((e) => CANCER_LABS.has(e.lab));
  const misconceptionIds = new Set<string>();
  const theoryIds = new Set<string>();
  for (const e of experiments) {
    strings({ title: e.title, goal: e.goal, intro: e.intro, prediction: e.prediction, controls: e.controls, allowedEdits: e.allowedEdits, tryAtHome: e.tryAtHome }, e.id, out);
    e.misconceptions.forEach((m: string) => misconceptionIds.add(m));
    theoryIds.add(e.theoryId);
  }
  for (const m of misconceptionIds) {
    strings(read(`misconceptions/${m}.json`), `misconception ${m}`, out);
    strings(read(`hints/${m}.json`), `hints ${m}`, out);
  }
  for (const t of theoryIds) strings(read(`theory/${t}.json`), `theory ${t}`, out);
  for (const file of ["root-beliefs.json", "ano-lines.json", "levels.json", "landing.json"]) strings(read(file), file, out);
  strings(read("labs.json").filter((l: { id: string }) => CANCER_LABS.has(l.id)), "labs.json", out);
  return out;
}

const SCARY = /\b(die|dies|died|dying|death|deadly|fatal|kill|kills|killed|killing|survival|survive|survivors?|terminal|incurable|tragic|horrible|terrifying|scary|blame|your fault|countdown|graphic|bleed\w*|tumou?r eats?)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;
/** Wording CLAUDE.md itself sets, checked by hand: the §3.3 option about cells in a dish, and Ano's §A health redirect. */
const SET_BY_SPEC = new Set(["They start dying off", "That's a big question, and I'm glad you asked. I can explain the science here, but for questions about you or someone you love, a doctor, nurse, parent or teacher is the right person to talk to. Would you like to keep exploring?"]);
// About 15 words or fewer (CLAUDE.md §5); a sentence may run a little over, never far.
const MAX_WORDS = 20;

describe("gentle, kid-friendly copy in the cancer labs", () => {
  const copy = cancerCopy().filter(([, s]) => !SET_BY_SPEC.has(s));

  it("finds the copy to check", () => {
    expect(copy.length).toBeGreaterThan(150);
  });

  it("has no scary, graphic or blaming words and no survival talk", () => {
    const hits = copy.filter(([, s]) => SCARY.test(s)).map(([w, s]) => `${w}: ${s}`);
    expect(hits).toEqual([]);
  });

  it("has no emojis and no em dashes", () => {
    const hits = copy.filter(([, s]) => EMOJI.test(s) || s.includes("—")).map(([w, s]) => `${w}: ${s}`);
    expect(hits).toEqual([]);
  });

  it(`keeps every sentence to ${MAX_WORDS} words or fewer`, () => {
    const long = copy.flatMap(([w, s]) =>
      s
        .split(/(?<=[.!?])\s+|\n/)
        .filter((sentence) => sentence.trim().split(/\s+/).length > MAX_WORDS)
        .map((sentence) => `${w}: ${sentence}`),
    );
    expect(long).toEqual([]);
  });
});
