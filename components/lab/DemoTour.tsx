"use client";

import { useEffect, useRef, useState } from "react";
import { IconPause, IconPlay } from "@/components/icons/icons";
import { useLab, verdictShown } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { playback } from "./playback";

/*
 * The 60-second guided tour on /demo (DESIGN.md §7.8): the real chemo
 * experiment drives itself. Ano says hello, the common guess "Nothing
 * happens to them" goes in, it runs, the ANOMALY moment plays, Ano explains
 * in kid language, then a quick pointer to the tumour experiment and "Try it
 * yourself". Every result on screen is the simulator's. Pause stops the tour
 * and the run; Skip jumps to the end.
 */

const GUESS = "Nothing happens to them";
const STEPS = [
  { at: 0, text: "Hi, I'm Ano! This is a one-minute tour of a real experiment about chemo." },
  { at: 4500, text: "Here's a common guess: when chemo starts, nothing happens to the hair follicle cells." },
  { at: 9000, text: "Let's run it. Chemo works on cells while they divide. Watch the three dishes." },
] as const;
const EXPLAIN = "Surprise! The hair follicle cells were affected too. They divide fast, so chemo affects them as well. Most hair loss from chemo is reversible once treatment is over.";
const AFTER_VERDICT_MS = 7000;

export function DemoTour({ onRun }: { onRun: () => void }) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const verdict = useLab(verdictShown);
  const ran = useRef(false);

  // The timed steps: hello, the guess, then Run.
  useEffect(() => {
    if (paused || done || step >= STEPS.length) return;
    const wait = step === 0 ? STEPS[0].at : STEPS[step].at - STEPS[step - 1].at;
    const id = window.setTimeout(() => {
      if (step === 1) useLab.getState().setPrediction({ type: "choice", value: GUESS });
      if (step === 2 && !ran.current) {
        ran.current = true;
        onRun();
      }
      setStep((s) => s + 1);
    }, step === 0 ? 0 : wait);
    return () => window.clearTimeout(id);
  }, [step, paused, done, onRun]);

  // After the verdict, Ano explains, then the tour ends.
  useEffect(() => {
    if (!verdict || paused || done) return;
    const id = window.setTimeout(() => setDone(true), AFTER_VERDICT_MS);
    return () => window.clearTimeout(id);
  }, [verdict, paused, done]);

  const togglePause = () => {
    setPaused((p) => {
      if (!p) playback.pause();
      else if (useLab.getState().phase === "running") playback.play();
      return !p;
    });
  };

  const text = done ? "That's the loop: guess, run, see what really happens, understand. Your turn!" : verdict ? EXPLAIN : STEPS[Math.max(0, Math.min(step, STEPS.length) - 1)]?.text ?? STEPS[0].text;
  return (
    <div data-demo-tour role="region" aria-label="Guided tour" className="pointer-events-auto fixed inset-x-4 top-20 z-40 mx-auto flex max-w-xl flex-col gap-3 rounded-card bg-white p-4 shadow-warm-lg sm:top-24">
      <p aria-live="polite" className="text-[16px] leading-relaxed text-ink-900">
        <span className="font-semibold text-apricot-700">Ano: </span>
        {text}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {done ? (
          <>
            <Button href="/labs/treatment/medium/treatment-chemo-hair">Try it yourself</Button>
            <Button variant="secondary" href="/labs/detection/easy/detection-tumour-growth">
              See how tumours grow
            </Button>
          </>
        ) : (
          <>
            <IconButton label={paused ? "Play the tour" : "Pause the tour"} onClick={togglePause}>
              {paused ? <IconPlay /> : <IconPause />}
            </IconButton>
            <Button variant="ghost" onClick={() => setDone(true)}>
              Skip the tour
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
