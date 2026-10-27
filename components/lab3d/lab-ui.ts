import { create } from "zustand";

/*
 * View state for the lab page that isn't part of the experiment itself
 * (the experiment lives in lib/store.ts): the "zoom to particles" toggle
 * (DESIGN.md §8.1 step 6).
 */

interface LabUiState {
  particles: boolean;
  setParticles: (on: boolean) => void;
}

export const useLabUi = create<LabUiState>()((set) => ({
  particles: false,
  setParticles: (particles) => set({ particles }),
}));
