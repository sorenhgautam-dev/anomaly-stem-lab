"use client";

import { useState } from "react";
import landing from "@/content/landing.json";
import { cn } from "@/lib/cn";
import { pageTop, scrollPageTo } from "@/lib/scroll";
import { RollingLetters } from "@/components/ui/RollingText";
import { PredictionChoices } from "@/components/ui/PredictionChoices";
import { AnoView } from "@/components/ano/AnoView";
import type { AnoExpression } from "@/components/ano/types";
import { LAB } from "@/lib/tokens";
import { useQuality } from "@/lib/quality";
import { HowChemo3D } from "./HowChemo3D";
import type { HowSequence } from "./how-sequence";
import { SectionHeading } from "./SectionHeading";
import { useScrollScene } from "./useScrollScene";

/*
 * How it works (DESIGN.md §7.1 item 2): one live sequence, not a row of
 * cards. The real chemo experiment plays through Guess, Run, Reveal and
 * Understand (states from the engine, how-sequence.ts) in one big microscope
 * field, with how many of each kind of cell are left under it, the guess as
 * choice cards, and one caption at a time beside it. Ano peeks in at the
 * field's edge and reacts to each step. Any guess can be picked; every
 * option's sequence comes from the simulator.
 *
 * On desktop the section pins and scroll drives the steps (§9.1); the step
 * number rolls over and a rail fills with the scene's progress. Pattern
 * studied from Aceternity's sticky scroll reveal and Skiper's scroll
 * progress, rebuilt with our own tokens and code. The step buttons always
 * work too: on phones, with reduced motion or from the keyboard they switch
 * the step; while pinned they scroll to it.
 */

const STEPS = landing.how.steps;
const COUNT = STEPS.length;

export function HowItWorks({ sequences, initial }: { sequences: Record<string, HowSequence>; initial: string }) {
  const { ref, step: scrolled, pinned } = useScrollScene<HTMLElement>(COUNT);
  // The Low tier keeps one 3D view here (the field): Ano's peek is decoration.
  const low = useQuality((s) => s.level === "low");
  const [chosen, setChosen] = useState(0);
  const [guess, setGuess] = useState(initial);
  const sequence = sequences[guess] ?? sequences[initial];
  const step = pinned ? scrolled : chosen;
  const bench = sequence.steps[step];
  const item = STEPS[step];
  // The reveal's words follow the guess on the cards.
  const body = item.id === "reveal" ? (sequence.right ? landing.how.revealRight : landing.how.revealWrong.replace("{guess}", guess)) : item.body;

  const go = (i: number) => {
    setChosen(i);
    const el = ref.current;
    if (!pinned || !el) return;
    // Glide to the middle of that step's slice of the pinned scene, through the page's smooth scroller.
    const travel = el.offsetHeight - window.innerHeight;
    scrollPageTo(pageTop(el) + travel * ((i + 0.5) / COUNT));
  };

  return (
    <section ref={ref} id="how-it-works" aria-labelledby="how-it-works-title" className={cn("relative scroll-mt-24", pinned && "h-[320vh]")}>
      <div className={cn("mx-auto flex w-full max-w-7xl flex-col px-4 py-24 sm:px-8 sm:py-32", pinned && "sticky top-0 z-15 h-dvh justify-center sm:py-0")}>
        {/* Phones read heading, steps, bench, caption (the left column dissolves into the grid); desktop puts the bench on the right. */}
        <div className={cn("grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14", pinned && "lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-10")}>
          {/* Short desktop screens: a smaller heading and no big step number, so the pinned scene fits. */}
          <div className="contents lg:flex lg:flex-col lg:gap-8 [@media(max-height:780px)]:lg:gap-5 [@media(max-height:780px)]:[&_h2]:text-[clamp(2.4rem,4.6vw,3.6rem)]">
            {/* The giant title leads the first step only; after that it folds away to a small label, so the step leads. */}
            <div className={cn("grid transition-[grid-template-rows,opacity] duration-500 ease-out-soft", !pinned || step === 0 ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
              {/* Room under the heavy type's tight line box, so the fold never trims the bottom of the letters. */}
              <div className="min-h-0 overflow-hidden pb-3">
                <SectionHeading id="how-it-works-title" title={landing.how.title} light />
              </div>
            </div>
            {pinned && (
              <p aria-hidden className={cn("-mb-4 text-[15px] font-semibold text-robo-gold transition-opacity duration-500", step === 0 ? "opacity-0" : "opacity-100")}>
                How it works
              </p>
            )}
            <div className="order-4 flex items-end gap-3 lg:order-none [@media(max-height:780px)]:lg:hidden" aria-hidden>
              <span key={step} data-roll="go" className="type-hero inline-block text-[clamp(4rem,7vw,6.5rem)] leading-[0.8] text-robo-gold">
                <RollingLetters text={`0${step + 1}`} />
              </span>
              <span className="type-readout pb-1.5 text-base text-cream-200/60">/ 0{COUNT}</span>
            </div>
            {/* One caption at a time; it rolls in when the step changes. */}
            <div aria-live="polite" className="order-4 -mt-4 min-h-[11rem] lg:order-none lg:mt-0">
              <h3 key={item.id} data-roll="go" className="type-heading text-[clamp(2rem,3.4vw,2.9rem)] text-white" aria-label={item.title}>
                <RollingLetters text={item.title} step={22} />
              </h3>
              <p key={`${item.id}-${guess}-body`} className="mt-3 max-w-md animate-fade-up text-[17px] leading-relaxed text-cream-200 motion-reduce:animate-none">
                {body}
              </p>
            </div>
            <div role="group" aria-label="Steps" className="relative order-2 flex flex-wrap gap-2 lg:order-none">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={i === step}
                  onClick={() => go(i)}
                  className={cn(
                    "h-11 rounded-full px-3.5 text-[14px] font-semibold sm:px-4 sm:text-[15px] transition-[background-color,color,box-shadow] duration-300 ease-out-soft",
                    i === step ? "bg-robo-gold text-ink-900" : "bg-white/10 text-cream-100 hover:bg-white/15 hover:text-white",
                  )}
                >
                  {s.title}
                </button>
              ))}
            </div>
            {/* How far the scene has played (pinned only). */}
            {pinned && (
              <span aria-hidden className="relative -mt-4 block h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
                <span className="absolute inset-0 origin-left scale-x-[var(--p,1)] rounded-full bg-robo-gold" />
              </span>
            )}
          </div>

          {/* One big microscope field with all three kinds of cells mixed, Ano peeking in at its edge; under it, how many of each are left, then the guess. */}
          <div className="relative order-3 flex flex-col items-center gap-5 lg:order-none [@media(max-height:820px)]:lg:gap-3.5">
            <div className="flex min-h-9 w-full flex-wrap items-center justify-center gap-2">
              <span key={bench.tag} className="paper-card inline-flex min-h-9 animate-pop-in items-center rounded-full px-3.5 py-1 text-center text-[14px] font-semibold leading-tight text-ink-900 motion-reduce:animate-none">
                {bench.tag}
              </span>
              {bench.verdict && (
                  <span key={`${step}-${bench.verdict}`} className={cn("inline-flex h-9 animate-pop-in items-center gap-2 rounded-full px-3.5 text-[14px] font-semibold motion-reduce:animate-none", bench.verdict === "correct" ? "bg-verify-100 text-verify-700" : "bg-anomaly-100 text-anomaly-700")}>
                    <span aria-hidden className={cn("size-2 rounded-full", bench.verdict === "correct" ? "bg-verify-500" : "bg-anomaly-500")} />
                    {bench.verdict === "correct" ? "Right!" : "Surprise!"}
                  </span>
              )}
            </div>
            <div className="relative w-full max-w-[25rem] [@media(max-height:820px)]:lg:max-w-[17.5rem]">
              {/* See-through: the field draws in the site canvas behind it (a pinned scene sits above the canvas, z-15). */}
              <HowChemo3D bench={bench} label={benchLabel(bench)} />
              {/* Ano peeks in beside the field (never over it: two 3D views can't overlap) and reacts to each step. */}
              {!low && <AnoView className="pointer-events-none absolute bottom-0 right-full hidden h-40 w-32 lg:block" framing="peek" expression={anoMood(step, sequence.right)} label="Ano, watching the cells" />}
            </div>
            <CellBars dishes={bench.dishes} guessedHair={bench.ghostHair} />
            <div className="flex w-full flex-col gap-2.5">
              <p className="text-[15px] font-semibold text-cream-100">{landing.how.choose}: {sequence.question}</p>
              <PredictionChoices question={sequence.question} options={sequence.options} value={guess} onChange={setGuess} lab="robotics" className="gap-2 sm:grid-cols-2 [&_button]:min-h-12" />
              {bench.run && (
                <p className="flex flex-wrap items-center gap-x-2 text-[15px]">
                  <span className="text-cream-200/70">What really happened</span>
                  <span className="font-semibold text-white">{bench.run.answer}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const BARS = [
  { key: "cancer", color: LAB.robotics.gold, left: "cells left" },
  { key: "hair", color: LAB.robotics.teal, left: "healthy cells left" },
  { key: "slow", color: LAB.chemistry.sage, left: "healthy cells left" },
] as const;

/** How many of each kind are left, as a big number over a bar that empties and refills (a transform, never a width). */
function CellBars({ dishes, guessedHair }: { dishes: HowSequence["steps"][number]["dishes"]; guessedHair: number | null }) {
  return (
    <ul className="grid w-full grid-cols-3 gap-3 sm:gap-5" aria-label="Cells left">
      {BARS.map((b) => {
        const v = Math.round(dishes[b.key]);
        return (
          <li key={b.key} className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-[13px] font-semibold leading-tight text-cream-100 sm:text-[15px]">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: b.color }} />
              {landing.how.bars[b.key]}
            </span>
            <span className="type-heading text-[clamp(1.75rem,3vw,2.5rem)] leading-none text-white">{v}%</span>
            <span className="text-[12px] leading-tight text-cream-200/70 sm:text-[13px]">{b.left}</span>
            <span aria-hidden className="relative mt-1 block h-2 rounded-full bg-white/10">
              <span className="block h-full origin-left rounded-full transition-transform duration-700 ease-out-soft motion-reduce:transition-none" style={{ background: b.color, transform: `scaleX(${v / 100})` }} />
              {/* The guess's idea, a white tick where the student expected the bar to be. */}
              {b.key === "hair" && guessedHair !== null && <span className="absolute -top-1 bottom-[-4px] w-0.5 rounded-full bg-white" style={{ left: `calc(${Math.min(100, guessedHair)}% - 1px)` }} />}
            </span>
            {b.key === "hair" && guessedHair !== null && <span className="text-[12px] font-semibold text-white sm:text-[13px]">Your guess: {Math.round(guessedHair)}%</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** Ano's face for each step: curious at the guess, thinking through the run, surprised or delighted at the reveal, happy once it's understood. */
function anoMood(step: number, right: boolean): AnoExpression {
  return (["curious", "thinking", right ? "celebrating" : "surprised", "happy"] as const)[step] ?? "happy";
}

/** What the field shows, for screen readers. */
function benchLabel(b: HowSequence["steps"][number]): string {
  const d = b.dishes;
  const parts = [`Three kinds of cells under the microscope. Cancer cells ${Math.round(d.cancer)}%, hair follicle cells ${Math.round(d.hair)}%, slow-dividing cells ${Math.round(d.slow)}%.`];
  if (b.run) parts.push(`What really happened: ${b.run.answer}.`);
  if (b.ghost) parts.push(`Your guess: ${b.ghost.answer}.`);
  return parts.join(" ");
}
