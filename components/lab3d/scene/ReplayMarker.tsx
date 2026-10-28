"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { PALETTE as P } from "@/lib/tokens";
import { useReplayState } from "@/components/lab/useReplay";
import { anchor, labView } from "../lab-state";
import { vfx } from "../kit/vfx";

/*
 * The 3D side of "the moment you were wrong": while the replay is stopped at
 * that moment, a red ring pulses on the bench round the part that shows it
 * (the stage's "focus" anchor), so the eye goes from the chart to the
 * apparatus. Reduced motion gets one ring, not a pulse.
 */

const PULSE_MS = 1300;

export function ReplayMarker() {
  const paused = useReplayState((s) => s.status === "paused");

  useEffect(() => {
    if (!paused) return;
    const ring = () => {
      const at = anchor(labView.focus ?? "focus");
      vfx.ring({ at: [at.x, 0.02, at.z], color: P.anomaly[500], from: 0.08, to: 0.9, life: 1.1 });
      vfx.burst({ at: [at.x, at.y, at.z], kind: "glow", count: 4, colors: [P.anomaly[500], P.white], speed: [0.05, 0.2], life: [0.5, 0.9], size: [0.12, 0.2], drag: 4 });
    };
    ring();
    if (prefersReducedMotion()) return;
    const id = window.setInterval(ring, PULSE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return null;
}
