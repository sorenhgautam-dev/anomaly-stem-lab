"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { ExperimentDef, TimelineFrame } from "@/engine/types";
import { experimentsFor } from "@/lib/content";
import { centreOf, fx } from "@/lib/fx";
import { useProgress } from "@/lib/progress";
import { anomalySting, glassClink, resolveChime, softClick, unlockAudio } from "@/lib/sound";
import { useLab } from "@/lib/store";
import { room, roomPulse, roomRun } from "@/components/labroom/room-state";
import { playback } from "./playback";

/*
 * Run → watch → verdict (CLAUDE.md §6.1, §3.7). Starts the simulator's
 * playback, fires the fault moment (sparks, a pop) when the board has
 * powered up, and stages the verdict when playback ends: a gold burst and
 * chime, or the ANOMALY glitch, sting and a small shake. The room reacts to
 * both. Every visual comes from the simulator's result, never the reverse.
 */

/** When a circuit's faults show: the board has nearly powered up (playback seconds). */
const FAULT_AT = 0.85;

/** How long a run plays: its timeline, or a short power-up for circuits. */
function durationFor(timeline: TimelineFrame[] | undefined): number {
  if (timeline && timeline.length > 1) return timeline[timeline.length - 1].t;
  return 1.6;
}

function levelDone(def: ExperimentDef): boolean {
  const done = useProgress.getState().done;
  return experimentsFor(def.lab, def.level).every((e) => done[e.id]);
}

export function useRun(def: ExperimentDef, main: RefObject<HTMLElement | null>, say: (text: string) => void) {
  const [flashId, setFlashId] = useState(0);
  const offFault = useRef<(() => void) | null>(null);
  useEffect(() => () => offFault.current?.(), []);

  const faultMoment = useCallback(
    (faults: string[]) => {
      const win = room.windowEl;
      if (faults.includes("short-circuit")) {
        const at = centreOf(win?.querySelector('[data-part="battery"]'));
        if (at) fx.shortCircuit(at);
        glassClink(1, 0.45);
        say("Spark and pop");
      }
      for (const f of faults) {
        if (!f.startsWith("burnout:")) continue;
        const at = centreOf(win?.querySelector(`[data-slot="${f.slice("burnout:".length)}"]`));
        if (at) fx.burnout(at);
        glassClink(0.8, 0.5);
        say("LED pops");
      }
    },
    [say],
  );

  const run = useCallback(() => {
    unlockAudio();
    softClick();
    const outcome = useLab.getState().run();
    if (!outcome) return;
    roomRun();
    const bench = centreOf(room.windowEl);
    if (bench) fx.powerUp(bench);
    offFault.current?.();
    offFault.current = null;
    const timeline = outcome.outcome.timeline;
    playback.setSpeed(1);
    playback.load(timeline, durationFor(timeline), () => {
      offFault.current?.();
      offFault.current = null;
      useLab.getState().reveal();
      const r = useLab.getState().result;
      if (!r) return;
      const centre = centreOf(room.windowEl) ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const wasDone = levelDone(def);
      useProgress.getState().recordRun(def.id, r.verdict === "correct", r.diagnosis?.evidence ?? null, r.diagnosis?.focus ?? null);
      if (r.verdict === "wrong") {
        setFlashId((n) => n + 1);
        fx.anomaly(centre);
        fx.shake(main.current, 1);
        roomPulse("anomaly");
        anomalySting();
        say("Glitch sting");
        return;
      }
      fx.success(centre);
      roomPulse("gold");
      resolveChime();
      say("Bright chime");
      if (!wasDone && levelDone(def)) {
        window.setTimeout(() => {
          fx.confetti();
          resolveChime();
        }, 450);
      }
    });
    // Subscribed after load(), so the first callback sees the new run's clock (t = 0).
    const faults = outcome.outcome.faults.filter((f) => f === "short-circuit" || f.startsWith("burnout:"));
    if (faults.length > 0) {
      let fired = false;
      offFault.current = playback.onFrame((t) => {
        if (fired || t < FAULT_AT) return;
        fired = true;
        faultMoment(faults);
      });
    }
  }, [def, faultMoment, main, say]);

  return { run, flashId };
}
