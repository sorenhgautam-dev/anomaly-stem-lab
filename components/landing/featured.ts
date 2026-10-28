import landing from "@/content/landing.json";
import { diagnose } from "@/engine/diagnose";
import { applyEdit, initialBuild } from "@/engine/edits";
import { matches } from "@/engine/match";
import { simulateOutcome } from "@/engine/outcome";
import { realModel } from "@/engine/registry";
import type { Outcome } from "@/engine/types";
import { getExperiment, misconceptionText } from "@/lib/content";
import type { HeroCardData } from "./HeroCards";

/*
 * The hero's floating cards, fed by the real simulator (DESIGN.md §0 bans
 * fake demos; §7.1 "running live in the stage card with real values"). Each
 * slide names a cancer experiment, the edits that set up its scenario and a
 * common guess. The engine runs it: the "What really happened" row, its
 * number and the verdict come from the real model. `answers` only shortens
 * the engine's own answer for the card (the engine picks which one); the
 * Learned card's title is the slide's lesson, or the diagnosed belief.
 * Pure and deterministic, so it runs once on the server.
 */

export interface Slide {
  id: "treatment" | "detection" | "cell";
  href: string;
  result: { title: string; confidence: string };
  run: { guess: string; experiment: string; edits: string[]; reading: { key: string; scale: number; digits: number; unit: string } };
  /** Short words for the engine's answers, keyed by the answer itself. */
  answers: Record<string, string>;
  belief: { title?: string; detail: string };
}

export const SLIDES = landing.slides as unknown as Slide[];

/** A reading, rounded for a card. */
function reading(outcome: Outcome, key: string, scale = 1, digits = 1): string {
  const v = (outcome.readings[key] ?? 0) * scale;
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  return String(Object.is(r, -0) ? 0 : r);
}

function run(slide: Slide): HeroCardData {
  const { result, belief, answers } = slide;
  const { experiment, edits, reading: unit } = slide.run;
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
  const answer = String(outcome.result.value);
  const focus = right ? null : diagnose(def, build, guess, {}).focus;
  const title = belief.title || (focus && misconceptionText(focus)?.title) || def.title;
  const value = Number(reading(outcome, unit.key, unit.scale, unit.digits));
  return {
    result: { title: result.title, confidence: result.confidence as HeroCardData["result"]["confidence"], prediction: answers[slide.run.guess] ?? slide.run.guess, reality: answers[answer] ?? answer, status: right ? "verified" : "anomaly" },
    belief: { title, detail: belief.detail, tone: right ? "verified" : "anomaly", status: right ? "True!" : "Surprise!" },
    href: slide.href,
    stage: { value, unit: unit.unit },
  };
}

/** Every featured slide's cards, computed by the engine. */
export function featuredCards(): HeroCardData[] {
  return SLIDES.map(run);
}
