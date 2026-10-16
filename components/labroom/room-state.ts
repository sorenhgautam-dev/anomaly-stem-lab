import { useEffect, type RefObject } from "react";
import { create } from "zustand";

/*
 * What the lab HUD (DOM) and the lab room (WebGL) share. Per-frame values
 * live in the plain mutable `room` object, never in React state (CLAUDE.md
 * §9); `useRoomReady` flips once, when the room has drawn its first frames.
 */

export const room = {
  /** The experiment window the camera locks to; null on the map (overview). */
  windowEl: null as HTMLElement | null,
  /** Window edges on its plane in world units, published by the camera rig each frame. */
  frame: { left: -1.5, right: 1.5, top: 1.2, bottom: -0.2 },
  /** Current camera pitch (radians), published by the camera rig. */
  pitch: 0,
  /** 0..1 pulses for the verdict moments; they decay inside the room. */
  gold: 0,
  anomaly: 0,
  /** Seconds since the last run started (the power-up wave on the robotics mat). */
  runAt: -100,
};

/** Light up the room for a verdict: a gold wave, or a coral glitch. */
export function roomPulse(kind: "gold" | "anomaly"): void {
  room[kind] = 1;
}

/** A run just started: the bench powers up. */
export function roomRun(): void {
  room.runAt = performance.now() / 1000;
}

export const useRoomReady = create<{ ready: boolean; setReady: (ready: boolean) => void }>()((set) => ({
  ready: false,
  setReady: (ready) => set({ ready }),
}));

/** Register an element as the window the room's camera locks to. */
export function useRoomWindow(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    room.windowEl = el;
    return () => {
      if (room.windowEl === el) room.windowEl = null;
    };
  }, [ref]);
}
