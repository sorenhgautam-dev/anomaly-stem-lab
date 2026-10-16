import { create } from "zustand";
import { CHAPTER_STOPS } from "./layout";

export type Guess = "heavy" | "light" | "same";
export type HeroResult = "correct" | "wrong";
export type HeroPhase = "ask" | "dropping" | "done";

/**
 * Coarse scroll state for React. These flip a handful of times over the whole
 * journey, never per frame (CLAUDE.md §9). Smooth, per-frame values go
 * through live.progress / onProgress() instead.
 */
export interface ScrollFlags {
  /** Still on the hero experiment. */
  atHero: boolean;
  /** Clearly into the chapters (Ano is out, the hero UI is gone). */
  pastHero: boolean;
  /** Nearest chapter index 0–3, or −1 before the chapters. */
  chapter: number;
}

export function flagsFor(progress: number): ScrollFlags {
  return {
    atHero: progress < 0.04,
    pastHero: progress > 0.06,
    chapter:
      progress < 0.125
        ? -1
        : CHAPTER_STOPS.reduce(
            (best, stop, i) =>
              Math.abs(progress - stop) < Math.abs(progress - CHAPTER_STOPS[best]) ? i : best,
            0,
          ),
  };
}

interface LandingState extends ScrollFlags {
  /** Shaders compiled and the first frames rendered. */
  sceneReady: boolean;
  /** Preloader finished and removed. */
  introDone: boolean;
  soundOn: boolean;

  heroPhase: HeroPhase;
  guess: Guess | null;
  heroResult: HeroResult | null;
  /** Bumps on every reset so the balls return to the start. */
  dropId: number;
  /** Bumps when ANOMALY DETECTED should play. */
  flashId: number;
  /** Ano may speak: set after the ANOMALY moment, so Ano never talks over it. */
  anoReady: boolean;
  caption: { id: number; text: string } | null;

  setSceneReady: () => void;
  setIntroDone: () => void;
  /** Update the coarse flags; a no-op unless one of them changed. */
  syncScroll: (progress: number) => void;
  toggleSound: () => void;
  makeGuess: (guess: Guess) => void;
  land: (result: HeroResult) => void;
  setAnoReady: () => void;
  resetHero: () => void;
  showCaption: (text: string) => void;
}

export const useLanding = create<LandingState>()((set, get) => ({
  ...flagsFor(0),
  sceneReady: false,
  introDone: false,
  soundOn: true,

  heroPhase: "ask",
  guess: null,
  heroResult: null,
  dropId: 0,
  flashId: 0,
  anoReady: false,
  caption: null,

  setSceneReady: () => set({ sceneReady: true }),
  setIntroDone: () => set({ introDone: true }),
  syncScroll: (progress) => {
    const next = flagsFor(progress);
    const now = get();
    if (next.atHero !== now.atHero || next.pastHero !== now.pastHero || next.chapter !== now.chapter) {
      set(next);
    }
  },
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
  makeGuess: (guess) => set({ guess, heroPhase: "dropping", heroResult: null }),
  land: (result) =>
    set((s) => ({
      heroPhase: "done",
      heroResult: result,
      flashId: result === "wrong" ? s.flashId + 1 : s.flashId,
    })),
  setAnoReady: () => set({ anoReady: true }),
  resetHero: () =>
    set((s) => ({
      heroPhase: "ask",
      guess: null,
      heroResult: null,
      anoReady: false,
      dropId: s.dropId + 1,
    })),
  showCaption: (text) => set((s) => ({ caption: { id: (s.caption?.id ?? 0) + 1, text } })),
}));
