import landing from "@/content/landing.json";
import { diagnose } from "@/engine/diagnose";
import { applyEdit, initialBuild } from "@/engine/edits";
import { matches } from "@/engine/match";
import { simulateOutcome } from "@/engine/outcome";
import { realModel } from "@/engine/registry";
import type { Outcome } from "@/engine/types";
import { getExperiment, misconceptionText } from "@/lib/content";
import { DROP, landingTime, realAnswer } from "./drop-sim";
import type { HeroCardData } from "./HeroCards";

/*
 * The hero's floating cards, fed by the real simulator (DESIGN.md §0 bans
 * fake demos; §7.1 "real values from the experiment actually running").
 * Each featured slide names an experiment, the edits that set up its
 * scenario and the guess a student makes. The engine runs it: the reality
 * row, its number and the verdict come from the real model, and the belief
 * card's title is the misconception the engine diagnoses from that guess.
 * Slide 1 is the "Which falls faster?" teaser, judged by its drop model.
 * Pure and deterministic, so it runs once on the server.
 */

interface Slide {
  id: string;
  href: string | null;
  result: { title: string; confidence: string };
  /** The scenario: an experiment, the edits that set it up and the guess. Slide 1 (no experiment) is the drop teaser. */
  run: { guess: string; experiment?: string; edits?: string[]; reading?: { key: string; scale: number; digits: number; unit: string } };
  /** The belief card's detail line; its title comes from the engine's diagnosis when there is one. */
  belief: { title?: string; detail: string };
}

const SLIDES = landing.slides as Slide[];

/** A reading, rounded for a card: e.g. 0 mA, 61.2 g. */
function reading(outcome: Outcome, key: string, scale = 1, digits = 1): string {
  const v = (outcome.readings[key] ?? 0) * scale;
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  return String(Object.is(r, -0) ? 0 : r);
}

function run(slide: Slide): HeroCardData {
  const { result, belief } = slide;
  const { experiment, edits = [], reading: unit } = slide.run;
  if (!experiment || !unit) {
    const answer = landing.hero.options.find((o) => o.id === realAnswer())!.label;
    const guess = landing.hero.options.find((o) => o.id === slide.run.guess)!.label;
    const right = guess === answer;
    return {
      result: { title: result.title, confidence: result.confidence as HeroCardData["result"]["confidence"], prediction: guess, reality: answer, status: right ? "verified" : "anomaly" },
      belief: { title: belief.title ?? result.title, detail: belief.detail, tone: right ? "verified" : "anomaly", status: right ? "True!" : "Not true!" },
      href: slide.href,
      // Both balls land at this moment (the drop model has no mass in it).
      stage: { value: Math.round(landingTime(DROP.g) * 100) / 100, unit: "s" },
    };
  }
  const def = getExperiment(experiment);
  if (!def) throw new Error(`Featured slide ${slide.id}: no experiment ${experiment}`);
  let build = initialBuild(def);
  for (const id of edits) {
    const edit = def.allowedEdits.find((e) => e.id === id);
    if (!edit) throw new Error(`Featured slide ${slide.id}: ${def.id} has no edit ${id}`);
    build = applyEdit(build, edit.edit);
  }
  const outcome = simulateOutcome(def, build, realModel(def.stage));
  const guess = { type: "choice" as const, value: slide.run.guess };
  const right = matches(def.prediction, guess, outcome.result);
  const value = `${outcome.result.value} · ${reading(outcome, unit.key, unit.scale, unit.digits)} ${unit.unit}`;
  // The belief behind the guess, as the engine diagnoses it.
  const focus = right ? null : diagnose(def, build, guess, {}).focus;
  const title = (focus && misconceptionText(focus)?.title) || belief.title || def.title;
  return {
    result: { title: result.title, confidence: result.confidence as HeroCardData["result"]["confidence"], prediction: slide.run.guess, reality: value, status: right ? "verified" : "anomaly" },
    belief: { title, detail: belief.detail, tone: right ? "verified" : "anomaly", status: right ? "True!" : "Not true!" },
    href: slide.href,
    stage: { value: Number(reading(outcome, unit.key, unit.scale, unit.digits)), unit: unit.unit },
  };
}

/** Every featured slide's cards, computed by the engine. */
export function featuredCards(): HeroCardData[] {
  return SLIDES.map(run);
}
