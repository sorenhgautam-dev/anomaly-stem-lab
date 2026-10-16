import { create } from "zustand";
import { conflict, type ConflictEdit } from "@/engine/conflict";
import { applyEdit, initialBuild } from "@/engine/edits";
import { runExperiment } from "@/engine/run";
import type { Build, EditDef, Evidence, ExperimentDef, Prediction, RunResult } from "@/engine/types";

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
  /** Bumps on every run, so animations restart. */
  runId: number;
  /** Diagnosis evidence carried across runs (seeded from saved progress). */
  evidence: Evidence;

  start: (def: ExperimentDef, evidence: Evidence) => void;
  /** Replace the build (placing, flipping, sliders). Clears a finished run. */
  setBuild: (build: Build) => void;
  edit: (edit: EditDef) => void;
  setPrediction: (prediction: Prediction) => void;
  setConfidence: (confidence: Confidence) => void;
  select: (id: string | null) => void;
  /** Run the simulator. The verdict shows when playback ends (reveal()). */
  run: () => RunResult | null;
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
  runId: 0,
  evidence: {},

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
      evidence,
    }),

  setBuild: (build) =>
    set((s) => ({
      build,
      // Changing the build after a run starts a fresh attempt.
      phase: s.phase === "running" ? s.phase : "build",
      result: s.phase === "running" ? s.result : null,
      conflict: s.phase === "running" ? s.conflict : null,
      ano: s.phase === "result" ? "building" : s.ano === "greet" ? "building" : s.ano,
    })),

  edit: (edit) => {
    const build = get().build;
    if (build) get().setBuild(applyEdit(build, edit));
  },

  setPrediction: (prediction) => set({ prediction, ano: "building" }),
  setConfidence: (confidence) => set({ confidence }),
  select: (selected) => set({ selected }),

  run: () => {
    const { def, build, prediction, evidence } = get();
    if (!def || !build || !prediction) return null;
    const result = runExperiment(def, build, prediction, evidence);
    const focus = result.diagnosis?.focus ?? null;
    // Show something useful in the inspector: the first bulb or LED.
    const lamp = build.parts.find((p) => p.kind === "bulb" || p.kind === "led")?.slot ?? null;
    set((s) => ({
      result,
      selected: s.selected ?? lamp,
      phase: "running",
      runId: s.runId + 1,
      hintStep: 0,
      conflict: focus ? conflict(def, build, focus) : null,
      evidence: result.diagnosis?.evidence ?? s.evidence,
    }));
    return result;
  },

  reveal: () => {
    const { result } = get();
    if (!result) return;
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
    });
  },

  reset: () => {
    const { def, evidence } = get();
    if (def) get().start(def, evidence);
  },
}));
