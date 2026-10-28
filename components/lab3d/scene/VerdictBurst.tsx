"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { freezeFor } from "@/components/three/frameloop";
import { useLab, verdictShown } from "@/lib/store";
import { PALETTE as P } from "@/lib/tokens";
import { LOOK } from "./set/look";
import { anchor, labView } from "../lab-state";
import { vfx } from "../kit/vfx";

/*
 * The verdict in 3D (DESIGN.md §8.1 "Reveal"): a correct prediction sends a
 * verify-green shockwave across the bench and a burst of two-colour 3D
 * confetti (verify green and the lab's gold) from the apparatus; an ANOMALY
 * sends a red ring and a low spray of sparks across the bench round the part
 * that matters, after the scene freezes for a beat (frameloop.ts) with a
 * glitch (html[data-glitch], app/globals.css). The giant word is the DOM overlay.
 */

const FREEZE_MS = 360;

export function VerdictBurst() {
  const runId = useLab((s) => s.runId);
  const lab = useLab((s) => s.def?.lab ?? "chemistry");
  const verdict = useLab(verdictShown);

  // ANOMALY: freeze the frame loop for a beat while the canvas glitches, then let go.
  useEffect(() => {
    if (verdict !== "wrong" || prefersReducedMotion()) return;
    const root = document.documentElement;
    const thaw = freezeFor(FREEZE_MS);
    root.dataset.glitch = "";
    const id = window.setTimeout(() => delete root.dataset.glitch, FREEZE_MS);
    return () => {
      window.clearTimeout(id);
      thaw();
      delete root.dataset.glitch;
    };
  }, [runId, verdict]);

  useEffect(() => {
    if (!verdict) return;
    const at = anchor(labView.focus);
    const floor: [number, number, number] = [at.x, 0.02, at.z];
    if (verdict === "correct") {
      vfx.ring({ at: floor, color: P.verify[500], from: 0.1, to: 3.2, life: 1.1 });
      vfx.ring({ at: floor, color: P.verify[700], from: 0.1, to: 2.4, life: 0.95, delay: 0.12 });
      vfx.burst({ at: [at.x, at.y + 0.1, at.z], kind: "confetti", count: 140, colors: [P.verify[500], LOOK[lab].accent], speed: [2.2, 4.4], dir: [0, 1, 0], cone: 0.55, life: [1.6, 2.6], size: [0.05, 0.085], gravity: 3.2, drag: 1.4 });
      vfx.burst({ at: [at.x, at.y, at.z], kind: "glow", count: 20, colors: [P.verify[500], P.white], speed: [0.4, 1.4], life: [0.4, 0.8], size: [0.12, 0.26], drag: 3 });
    } else {
      vfx.ring({ at: floor, color: P.anomaly[500], from: 0.1, to: 2.8, life: 0.9 });
      vfx.ring({ at: [floor[0] + 0.04, floor[1], floor[2]], color: P.anomaly[700], from: 0.1, to: 2.6, life: 0.75, delay: 0.06 });
      // Sparks spray from the floor ring, not the part: on the part they read as a burnout the simulator didn't show.
      vfx.burst({ at: floor, kind: "spark", count: 30, colors: [P.anomaly[500], P.anomaly[700]], speed: [1.2, 2.6], dir: [0, 1, 0], cone: 1.2, life: [0.35, 0.7], size: [0.018, 0.03], gravity: 4, drag: 1.2 });
    }
  }, [runId, verdict, lab]);

  return null;
}
