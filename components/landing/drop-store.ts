import { create } from "zustand";
import type { DropGuess } from "./drop-sim";

/*
 * The hero teaser's state, shared by the page (choices, verdict) and the 3D
 * drop scene. Changes only on clicks; the scene reads `startedAt` to run its
 * own clock each frame.
 */

export type DropPhase = "off" | "guess" | "dropping" | "result";

interface DropState {
  phase: DropPhase;
  guess: DropGuess | null;
  /** performance.now() when the balls were released. */
  startedAt: number;
  dropId: number;
  open: () => void;
  close: () => void;
  setGuess: (guess: DropGuess) => void;
  drop: () => void;
  finish: () => void;
  again: () => void;
}

export const useDrop = create<DropState>()((set, get) => ({
  phase: "off",
  guess: null,
  startedAt: 0,
  dropId: 0,
  open: () => set({ phase: "guess", guess: null }),
  close: () => set({ phase: "off", guess: null }),
  setGuess: (guess) => set({ guess }),
  drop: () => {
    if (!get().guess) return;
    set((s) => ({ phase: "dropping", startedAt: performance.now(), dropId: s.dropId + 1 }));
  },
  finish: () => set({ phase: "result" }),
  again: () => set({ phase: "guess" }),
}));
