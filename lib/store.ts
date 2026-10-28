import { create } from "zustand";
import { conflict, type ConflictEdit } from "@/engine/conflict";
import { applyEdit, initialBuild } from "@/engine/edits";
import { matches } from "@/engine/match";
import { realModel } from "@/engine/registry";
import { runExperiment, simulateOutcome } from "@/engine/run";
import type { Build, CircuitPartKind, EditDef, Evidence, ExperimentDef, Prediction, RunResult } from "@/engine/types";
import { applyWhatIf, type WhatIf } from "@/lib/what-if";

/*
 * State for one experiment session (CLAUDE.md §4: current experiment,
 * prediction, verdict, Ano state). Changes only on student actions and run
 * events, never per frame: playback time lives in components/lab/playback.ts.
 */

/** Ano's states (CLAUDE.md §7.1). */
export type AnoState = "greet" | "building" | "correct" | "wrong" | "stuck" | "levelUp";

/** Where the student is in the loop: build → predict → run → result. */
export type LabPhase = "build" | "running" | "result";

/** How sure the student is about the prediction (the mission bar's confidence setting). */
export type Confidence = "guess" | "fairly" | "certain";

/** 0 = no hint yet, 3 = the whole ladder (nudge, principle, fix) shown. */
export type HintStep = 0 | 1 | 2 | 3;

/**
 * A "What if?" run: the student's build with one variation, run straight
 * away to explore. It isn't a test of a guess, so it never counts toward
 * progress, never plays the verdict moment and never adds diagnosis evidence.
 */
export interface Explore {
  variant: WhatIf;
  /** Readings of the run before the change (for "went from … to …"), or null. */
  before: Record<string, number> | null;
  /** The build before the change, so "Undo the change" can go back. */
  from: Build;
}

interface LabState {
  def: ExperimentDef | null;
  build: Build | null;
  phase: LabPhase;
  prediction: Prediction | null;
  confidence: Confidence;
  result: RunResult | null;
  /** The small edit where the belief and reality disagree most (wrong runs). */
  conflict: ConflictEdit | null;
  hintStep: HintStep;
  ano: AnoState;
  /** Selected slot or instrument, shown in the inspector. */
  selected: string | null;
  /** The tray part picked up, waiting for a slot (circuits). Shared by the HUD tray and the 3D bench. */
  armed: CircuitPartKind | null;
  /** Bumps on every run, so animations restart. */
  runId: number;
  /** Diagnosis evidence carried across runs (seeded from saved progress). */
  evidence: Evidence;
  /** Set while a "What if?" run plays and shows its result. */
  explore: Explore | null;

  start: (def: ExperimentDef, evidence: Evidence) => void;
  /** Saved evidence arrived (IndexedDB loads after the page): seed it without restarting the attempt. */
  seedEvidence: (evidence: Evidence) => void;
  /** Replace the build (placing, flipping, sliders). Clears a finished run. */
  setBuild: (build: Build) => void;
  edit: (edit: EditDef) => void;
  setPrediction: (prediction: Prediction) => void;
  setConfidence: (confidence: Confidence) => void;
  select: (id: string | null) => void;
  arm: (kind: CircuitPartKind | null) => void;
  /** Put the armed (or given) part into a slot, with the slot's starting settings. */
  place: (slot: string, kind?: CircuitPartKind) => void;
  /** Run the simulator. The verdict shows when playback ends (reveal()). */
  run: () => RunResult | null;
  /** Apply a "What if?" variation and run it at once (no prediction needed). */
  whatIf: (variant: WhatIf) => RunResult | null;
  reveal: () => void;
  nextHint: () => void;
  /** Apply the suggested conflict edit and get ready to run again. */
  tryConflict: () => void;
  reset: () => void;
}

export const useLab = create<LabState>()((set, get) => ({
  def: null,
  build: null,
  phase: "build",
  prediction: null,
  confidence: "fairly",
  result: null,
  conflict: null,
  hintStep: 0,
  ano: "greet",
  selected: null,
  armed: null,
  runId: 0,
  evidence: {},
  explore: null,

  start: (def, evidence) =>
    set({
      def,
      build: initialBuild(def),
      phase: "build",
      prediction: null,
      result: null,
      conflict: null,
      hintStep: 0,
      ano: "greet",
      selected: null,
      armed: null,
      evidence,
      explore: null,
    }),

  // Only fills empty evidence: a run's own diagnosis evidence is never overwritten.
  seedEvidence: (evidence) => set((s) => (Object.keys(s.evidence).length === 0 ? { evidence } : s)),

  setBuild: (build) =>
    set((s) => ({
      build,
      // Changing the build after a run starts a fresh attempt.
      phase: s.phase === "running" ? s.phase : "build",
      result: s.phase === "running" ? s.result : null,
      conflict: s.phase === "running" ? s.conflict : null,
      explore: s.phase === "running" ? s.explore : null,
      ano: s.phase === "result" ? "building" : s.ano === "greet" ? "building" : s.ano,
    })),

  edit: (edit) => {
    const build = get().build;
    if (build) get().setBuild(applyEdit(build, edit));
  },

  setPrediction: (prediction) => set({ prediction, ano: "building" }),
  setConfidence: (confidence) => set({ confidence }),
  select: (selected) => set({ selected }),
  arm: (armed) => set({ armed }),
  place: (slot, kind) => {
    const { def, armed } = get();
    const part = kind ?? armed;
    if (!def || !part) return;
    const template = def.board?.slots.find((s) => s.id === slot)?.initial;
    get().edit({ op: "place", slot, kind: part, props: template?.kind === part ? { ...template.props } : undefined });
    set({ selected: slot, armed: null });
  },

  run: () => {
    const { def, build, prediction, evidence, phase } = get();
    // A double click (or Enter held down) mustn't start a second run over the first.
    if (!def || !build || !prediction || phase === "running") return null;
    const result = runExperiment(def, build, prediction, evidence);
    const focus = result.diagnosis?.focus ?? null;
    // Show something useful in the inspector: the first bulb or LED.
    const lamp = build.parts.find((p) => p.kind === "bulb" || p.kind === "led")?.slot ?? null;
    set((s) => ({
      result,
      selected: s.selected ?? lamp,
      armed: null,
      phase: "running",
      runId: s.runId + 1,
      hintStep: 0,
      conflict: focus ? conflict(def, build, focus) : null,
      evidence: result.diagnosis?.evidence ?? s.evidence,
      explore: null,
    }));
    return result;
  },

  whatIf: (variant) => {
    const { def, build, prediction, result: last, phase } = get();
    if (!def || !build || phase === "running") return null;
    const next = applyWhatIf(build, variant);
    const outcome = simulateOutcome(def, next, realModel(def.stage));
    // The verdict field is filled honestly for the shared result shape, but a What if? is never judged.
    const result: RunResult = {
      verdict: prediction && matches(def.prediction, prediction, outcome.result) ? "correct" : "wrong",
      outcome,
      diagnosis: null,
      goalMet: true,
    };
    set((s) => ({
      build: next,
      result,
      phase: "running",
      runId: s.runId + 1,
      hintStep: 0,
      conflict: null,
      armed: null,
      explore: { variant, before: last ? last.outcome.readings : null, from: build },
    }));
    return result;
  },

  reveal: () => {
    const { result, explore } = get();
    if (!result) return;
    if (explore) {
      set({ phase: "result", ano: "building", hintStep: 0 });
      return;
    }
    set({
      phase: "result",
      ano: result.verdict === "correct" ? "correct" : "wrong",
      hintStep: result.verdict === "wrong" ? 1 : 0,
    });
  },

  nextHint: () => set((s) => ({ hintStep: Math.min(3, s.hintStep + 1) as HintStep, ano: "stuck" })),

  tryConflict: () => {
    const { conflict: suggestion } = get();
    if (!suggestion) return;
    set({
      build: suggestion.build,
      phase: "build",
      result: null,
      conflict: null,
      hintStep: 0,
      ano: "building",
      explore: null,
    });
  },

  reset: () => {
    const { def, evidence } = get();
    if (def) get().start(def, evidence);
  },
}));

/** The verdict the lab shows: only after a judged run's playback, never for a "What if?" run. */
export function verdictShown(s: Pick<LabState, "phase" | "result" | "explore">): "correct" | "wrong" | null {
  return s.phase === "result" && !s.explore ? (s.result?.verdict ?? null) : null;
}
