"use client";

import { useEffect, type RefObject } from "react";
import landing from "@/content/landing.json";
import { centreOf, fx } from "@/lib/fx";
import { anomalySting, resolveChime, unlockAudio } from "@/lib/sound";
import { toast } from "@/components/ui/Toast";
import { DROP_SECONDS, landingTime, DROP } from "./drop-sim";
import { useDrop } from "./drop-store";
import { verdictFor } from "./DropControls";

/*
 * Runs a drop: the thuds land on the model's landing time, and when the balls
 * settle the verdict plays (gold-green burst and confetti, or the ANOMALY
 * glitch), each sound with a caption (CLAUDE.md §9).
 */

export function useDropRun(view: RefObject<HTMLElement | null>, headline: RefObject<HTMLElement | null>) {
  const phase = useDrop((s) => s.phase);
  const dropId = useDrop((s) => s.dropId);

  useEffect(() => {
    if (phase !== "dropping") return;
    unlockAudio();
    const thud = window.setTimeout(() => toast(`[${landing.captions.landing}]`, 2200), landingTime(DROP.g) * 1000);
    const done = window.setTimeout(() => {
      useDrop.getState().finish();
      const at = centreOf(view.current) ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      if (verdictFor(useDrop.getState().guess) === "correct") {
        fx.success(at, 1.2);
        fx.confetti();
        resolveChime();
        toast(`[${landing.captions.correct}]`, 2200);
      } else {
        fx.anomaly(at, 1.2);
        fx.shake(headline.current, 1.4);
        anomalySting();
        toast(`[${landing.captions.anomaly}]`, 2200);
      }
    }, DROP_SECONDS * 1000);
    return () => {
      window.clearTimeout(thud);
      window.clearTimeout(done);
    };
  }, [phase, dropId, view, headline]);
}
