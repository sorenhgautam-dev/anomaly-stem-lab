"use client";

import { openDB, type IDBPDatabase } from "idb";
import { create } from "zustand";
import type { Evidence, ExperimentDef } from "@/engine/types";
import type { Confidence } from "@/lib/store";

/*
 * Progress lives only in this browser's IndexedDB (CLAUDE.md §2: no accounts,
 * no personal data). Components must wait for `hydrated` before trusting it
 * (CLAUDE.md §9: no hydration mismatches). If IndexedDB is unavailable
 * (private windows), progress simply lasts for the session.
 */

interface Saved {
  /** Experiments finished with a correct prediction. */
  done: Record<string, true>;
  /** Diagnosis evidence per misconception id. */
  evidence: Evidence;
  /** Misconceptions the student was diagnosed with and then got past. */
  broken: Record<string, true>;
  /** Misconception ids seen in each experiment's wrong runs (to know what a fix broke). */
  suspected: Record<string, string[]>;
  /** How often each confidence setting's guesses were right (the calibration meter). */
  calls: Calls;
}

export type Calls = Record<Confidence, { right: number; total: number }>;

interface ProgressState extends Saved {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Record a run: evidence from diagnosis, the guess's confidence, and completion on a correct one. Returns the beliefs this run broke. */
  recordRun: (experimentId: string, correct: boolean, evidence: Evidence | null, focus: string | null, confidence: Confidence) => string[];
  reset: () => void;
}

const NO_CALLS: Calls = { guess: { right: 0, total: 0 }, fairly: { right: 0, total: 0 }, certain: { right: 0, total: 0 } };
const EMPTY: Saved = { done: {}, evidence: {}, broken: {}, suspected: {}, calls: NO_CALLS };
const KEY = "progress";

let dbPromise: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB("anomaly", 1, {
    upgrade(database) {
      database.createObjectStore("state");
    },
  });
  return dbPromise;
}

async function load(): Promise<Saved> {
  try {
    const saved = (await (await db()).get("state", KEY)) as Partial<Saved> | undefined;
    // Older saves have no calls: start the meter at zero instead of dropping the rest.
    return { ...EMPTY, ...saved, calls: { ...NO_CALLS, ...saved?.calls } };
  } catch {
    return EMPTY;
  }
}

async function save(state: Saved): Promise<void> {
  try {
    await (await db()).put("state", state, KEY);
  } catch {
    // No IndexedDB: progress lasts for this session only.
  }
}

function snapshot(s: Saved): Saved {
  return { done: s.done, evidence: s.evidence, broken: s.broken, suspected: s.suspected, calls: s.calls };
}

export const useProgress = create<ProgressState>()((set, get) => ({
  ...EMPTY,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    const saved = await load();
    set({ ...saved, hydrated: true });
  },
  recordRun: (experimentId, correct, evidence, focus, confidence) => {
    const s = get();
    const suspected = { ...s.suspected };
    if (!correct && focus) {
      suspected[experimentId] = [...new Set([...(suspected[experimentId] ?? []), focus])];
    }
    const broken = { ...s.broken };
    const done = { ...s.done };
    const newlyBroken: string[] = [];
    if (correct) {
      done[experimentId] = true;
      // A correct run after a diagnosed wrong one breaks that belief.
      for (const id of suspected[experimentId] ?? []) {
        if (!broken[id]) newlyBroken.push(id);
        broken[id] = true;
      }
    }
    const was = s.calls[confidence];
    const calls: Calls = { ...s.calls, [confidence]: { right: was.right + (correct ? 1 : 0), total: was.total + 1 } };
    const next: Saved = { done, evidence: evidence ?? s.evidence, broken, suspected, calls };
    set(next);
    void save(snapshot(next));
    return newlyBroken;
  },
  reset: () => {
    set({ ...EMPTY });
    void save(EMPTY);
  },
}));

/** Open once every earlier experiment in its lab and level is done. */
export function isUnlocked(experiment: ExperimentDef, siblings: ExperimentDef[], done: Record<string, true>): boolean {
  return siblings.filter((e) => e.order < experiment.order).every((e) => done[e.id]);
}
