import { conflict } from "@/engine/conflict";
import { diagnose } from "@/engine/diagnose";
import { applyEdit, initialBuild, partInSlot } from "@/engine/edits";
import { matches } from "@/engine/match";
import { simulateOutcome } from "@/engine/outcome";
import { realModel, wrongModel } from "@/engine/registry";
import type { Build, ExperimentDef } from "@/engine/types";
import { getExperiment, misconceptionText } from "@/lib/content";

/*
 * "How it works" as one live sequence (DESIGN.md §7.1 item 1): the real
 * Light the LED experiment played through Predict, Diagnose, Break and
 * Rebuild. Every state comes from the engine, run once on the server:
 *
 *   Predict   the backwards LED with its resistor in, and a student's "Glow".
 *   Diagnose  the real run (dark, no current) next to the ghost of the belief
 *             the engine diagnoses from that guess.
 *   Break     the edit conflict() picks, where belief and reality disagree most.
 *   Rebuild   the LED turned round: the guess comes true.
 */

export interface HowBench {
  /** Which way the LED sits, and what fills the resistor's slot. */
  flipped: boolean;
  slot: "resistor" | "wire" | "empty";
  /** The real run, once there is one: is the LED lit, and the current through it (mA). */
  run: { lit: boolean; burnt: boolean; mA: number; answer: string } | null;
  /** The belief's ghost, when the engine has one to show. */
  ghost: { lit: boolean; burnt: boolean; answer: string } | null;
  verdict: "correct" | "wrong" | null;
  /** One short label on the bench: the guess, the belief or the edit. */
  tag: string;
}

export interface HowSequence {
  guess: string;
  options: string[];
  steps: HowBench[];
}

const LED = "robotics-led";

function bench(def: ExperimentDef, build: Build) {
  const led = partInSlot(build, "led");
  const r = partInSlot(build, "r");
  return { flipped: Boolean(led?.props?.flipped), slot: r ? (r.kind === "wire" ? ("wire" as const) : ("resistor" as const)) : ("empty" as const) };
}

function runOf(def: ExperimentDef, build: Build, model = realModel(def.stage)) {
  const o = simulateOutcome(def, build, model);
  return { lit: (o.readings["led.lit"] ?? 0) > 0, burnt: (o.readings["led.burnt"] ?? 0) > 0, mA: Math.round((o.readings["led.current"] ?? 0) * 10000) / 10, answer: String(o.result.value), result: o.result };
}

export function howSequence(): HowSequence {
  const def = getExperiment(LED);
  if (!def || def.prediction.type !== "choice") throw new Error("How it works needs the LED experiment");
  const edit = (id: string) => def.allowedEdits.find((e) => e.id === id)!.edit;
  const guess = def.prediction.options[0];
  const prediction = { type: "choice" as const, value: guess };

  // Predict: the backwards LED as the experiment starts, with the resistor in.
  const start = applyEdit(initialBuild(def), edit("add-resistor"));
  // Diagnose: the real run, and the belief the engine finds behind "Glow".
  const real = runOf(def, start);
  const found = diagnose(def, start, prediction, {});
  const belief = found.focus;
  const ghost = found.ghost ? { lit: (found.ghost.readings["led.lit"] ?? 0) > 0, burnt: (found.ghost.readings["led.burnt"] ?? 0) > 0, answer: String(found.ghost.result.value) } : null;
  // Break: the one edit where that belief and reality disagree the most.
  const cracked = belief ? conflict(def, start, belief) : null;
  const model = belief ? wrongModel(belief) : undefined;
  // Rebuild: turn the LED round and run the same guess again.
  const fixed = applyEdit(start, edit("flip-led"));
  const rebuilt = runOf(def, fixed);
  const strip = (r: ReturnType<typeof runOf>) => ({ lit: r.lit, burnt: r.burnt, mA: r.mA, answer: r.answer });

  const steps: HowBench[] = [
    { ...bench(def, start), run: null, ghost: null, verdict: null, tag: `Your guess: ${guess}` },
    { ...bench(def, start), run: strip(real), ghost, verdict: matches(def.prediction, prediction, real.result) ? "correct" : "wrong", tag: (belief && misconceptionText(belief)?.title) ?? "No match" },
  ];
  if (cracked && model) {
    const r = runOf(def, cracked.build);
    const b = runOf(def, cracked.build, model);
    steps.push({ ...bench(def, cracked.build), run: strip(r), ghost: { lit: b.lit, burnt: b.burnt, answer: b.answer }, verdict: "wrong", tag: cracked.edit.label });
  } else {
    steps.push(steps[1]);
  }
  steps.push({ ...bench(def, fixed), run: strip(rebuilt), ghost: null, verdict: matches(def.prediction, prediction, rebuilt.result) ? "correct" : "wrong", tag: def.allowedEdits.find((e) => e.id === "flip-led")!.label });
  return { guess, options: def.prediction.options, steps };
}
