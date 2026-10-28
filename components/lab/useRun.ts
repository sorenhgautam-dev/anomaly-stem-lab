"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExperimentDef, TimelineFrame } from "@/engine/types";
import { experimentsFor } from "@/lib/content";
import { fx } from "@/lib/fx";
import { useProgress } from "@/lib/progress";
import { glassClink, glitchStutter, resolveChime, softClick, spinUp, resumeAudio } from "@/lib/sound";
import { useLab } from "@/lib/store";
import { PALETTE as P } from "@/lib/tokens";
import { anchor, labView } from "@/components/lab3d/lab-state";
import { vfx } from "@/components/lab3d/kit/vfx";
import { playback } from "./playback";
import { SLAM_LAND_MS } from "./VerdictMoment";

/*
 * Run → watch → verdict (CLAUDE.md §6.1, DESIGN.md §8.1). Starts the
 * simulator's playback; a short or a burnout sparks and smokes at that part
 * in 3D once the board has powered up; when playback ends the verdict lands:
 * the success moment (chime) or the ANOMALY moment (sting), with Ano flying
 * to the part that matters. Every sound has a caption. The simulator decides
 * everything shown here.
 */

/** When a circuit's faults show: the board has nearly powered up (playback seconds). */
const FAULT_AT = 0.85;

function durationFor(timeline: TimelineFrame[] | undefined): number {
  if (timeline && timeline.length > 1) return timeline[timeline.length - 1].t;
  return 1.6;
}

function levelDone(def: ExperimentDef): boolean {
  const done = useProgress.getState().done;
  return experimentsFor(def.lab, def.level).every((e) => done[e.id]);
}

function faultMoment(def: ExperimentDef, faults: string[], say: (text: string) => void) {
  if (faults.includes("short-circuit")) {
    const battery = def.board?.slots.find((s) => s.fixed?.kind === "battery");
    const at = anchor(battery?.id);
    vfx.burst({ at: [at.x, at.y, at.z], kind: "spark", count: 60, colors: [P.apricot[300], P.white, P.apricot[500]], speed: [1.6, 3.4], dir: [0, 1, 0], cone: 0.4, life: [0.35, 0.8], size: [0.012, 0.022], gravity: 6, drag: 0.8 });
    vfx.burst({ at: [at.x, at.y + 0.1, at.z], kind: "smoke", count: 10, colors: ["#c9c2d6", "#b8b0c8"], speed: [0.1, 0.3], dir: [0, 1, 0], cone: 0.8, life: [1.6, 2.6], size: [0.18, 0.3], grow: 0.25, spread: 0.12, delay: 0.2 });
    glassClink(1, 0.45);
    say("Spark and pop");
  }
  for (const f of faults) {
    if (!f.startsWith("burnout:")) continue;
    const at = anchor(f.slice("burnout:".length));
    vfx.burst({ at: [at.x, at.y, at.z], kind: "glow", count: 6, colors: [P.white, P.apricot[300]], speed: [0.2, 0.6], life: [0.2, 0.4], size: [0.2, 0.35], drag: 4 });
    vfx.burst({ at: [at.x, at.y, at.z], kind: "spark", count: 22, colors: [P.apricot[300], P.white], speed: [1, 2.4], dir: [0, 1, 0], cone: 0.5, life: [0.3, 0.7], size: [0.01, 0.018], gravity: 5 });
    vfx.burst({ at: [at.x, at.y + 0.05, at.z], kind: "smoke", count: 8, colors: ["#c9c2d6"], speed: [0.08, 0.22], dir: [0, 1, 0], cone: 0.85, life: [1.8, 2.8], size: [0.12, 0.2], grow: 0.2, delay: 0.1 });
    glassClink(0.8, 0.5);
    say("LED pops");
  }
}

export function useRun(def: ExperimentDef, say: (text: string) => void) {
  const [moment, setMoment] = useState<{ id: number; verdict: "correct" | "wrong"; levelUp: boolean } | null>(null);
  const offFault = useRef<(() => void) | null>(null);
  useEffect(() => () => offFault.current?.(), []);

  const run = useCallback(() => {
    resumeAudio();
    softClick();
    const started = useLab.getState().run();
    if (started) spinUp();
    if (!started) return;
    offFault.current?.();
    offFault.current = null;
    // Ano flies to the part the "try this" edit changes, or the main apparatus.
    const editSlot = useLab.getState().conflict?.edit.edit;
    labView.focus = editSlot && "slot" in editSlot && labView.anchors.has(editSlot.slot) ? editSlot.slot : labView.anchors.has("focus") ? "focus" : (def.board?.slots.find((s) => s.accepts.includes("led") || s.initial?.kind === "led" || s.initial?.kind === "bulb")?.id ?? null);
    const timeline = started.outcome.timeline;
    playback.setSpeed(1);
    playback.load(timeline, durationFor(timeline), () => {
      offFault.current?.();
      offFault.current = null;
      useLab.getState().reveal();
      const r = useLab.getState().result;
      if (!r) return;
      const wasDone = levelDone(def);
      useProgress.getState().recordRun(def.id, r.verdict === "correct", r.diagnosis?.evidence ?? null, r.diagnosis?.focus ?? null);
      const levelUp = r.verdict === "correct" && !wasDone && levelDone(def);
      setMoment((m) => ({ id: (m?.id ?? 0) + 1, verdict: r.verdict, levelUp }));
      if (r.verdict === "wrong") {
        // Stutters through the freeze, then slams as the word lands.
        glitchStutter(SLAM_LAND_MS / 1000);
        say("Glitch sting");
        return;
      }
      resolveChime();
      say("Bright chime");
      if (levelUp) {
        window.setTimeout(() => {
          fx.confetti();
          resolveChime();
          say("Level complete chime");
        }, 650);
      }
    });
    const faults = started.outcome.faults.filter((f) => f === "short-circuit" || f.startsWith("burnout:"));
    if (faults.length > 0) {
      let fired = false;
      offFault.current = playback.onFrame((t) => {
        if (fired || t < FAULT_AT) return;
        fired = true;
        faultMoment(def, faults, say);
      });
    }
  }, [def, say]);

  return { run, moment };
}
