"use client";

import { openDB, type IDBPDatabase } from "idb";
import { create } from "zustand";
import type { Evidence, ExperimentDef } from "@/engine/types";

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
}

interface ProgressState extends Saved {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Record a run: evidence from diagnosis, and completion on a correct one. */
  recordRun: (experimentId: string, correct: boolean, evidence: Evidence | null, focus: string | null) => void;
  reset: () => void;
}

const EMPTY: Saved = { done: {}, evidence: {}, broken: {}, suspected: {} };
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
    return { ...EMPTY, ...saved };
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
  return { done: s.done, evidence: s.evidence, broken: s.broken, suspected: s.suspected };
}

export const useProgress = create<ProgressState>()((set, get) => ({
  ...EMPTY,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    const saved = await load();
    set({ ...saved, hydrated: true });
  },
  recordRun: (experimentId, correct, evidence, focus) => {
    const s = get();
    const suspected = { ...s.suspected };
    if (!correct && focus) {
      suspected[experimentId] = [...new Set([...(suspected[experimentId] ?? []), focus])];
    }
    const broken = { ...s.broken };
    const done = { ...s.done };
    if (correct) {
      done[experimentId] = true;
      // A correct run after a diagnosed wrong one breaks that belief.
      for (const id of suspected[experimentId] ?? []) broken[id] = true;
    }
    const next: Saved = { done, evidence: evidence ?? s.evidence, broken, suspected };
    set(next);
    void save(snapshot(next));
  },
  reset: () => {
    set({ ...EMPTY });
    void save(EMPTY);
  },
}));

/** Unlocked if every earlier experiment in its lab and level is done. */
export function isUnlocked(experiment: ExperimentDef, siblings: ExperimentDef[], done: Record<string, true>): boolean {
  return siblings.filter((e) => e.order < experiment.order).every((e) => done[e.id]);
}
