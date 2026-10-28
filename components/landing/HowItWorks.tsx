"use client";

import { useState } from "react";
import landing from "@/content/landing.json";
import { cn } from "@/lib/cn";
import { RollingLetters } from "@/components/ui/RollingText";
import { HowBench3D } from "./HowBench3D";
import type { HowSequence } from "./how-sequence";
import { SectionHeading } from "./SectionHeading";
import { useScrollScene } from "./useScrollScene";

/*
 * How it works (DESIGN.md §7.1 item 1): one live sequence, not a row of
 * cards. The real Light the LED experiment plays through Predict, Diagnose,
 * Break and Rebuild (states from the engine, how-sequence.ts) on one bench,
 * with one caption at a time beside it.
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

export function HowItWorks({ sequence }: { sequence: HowSequence }) {
  const { ref, step: scrolled, pinned } = useScrollScene<HTMLElement>(COUNT);
  const [chosen, setChosen] = useState(0);
  const step = pinned ? scrolled : chosen;
  const bench = sequence.steps[step];
  const item = STEPS[step];

  const go = (i: number) => {
    setChosen(i);
    const el = ref.current;
    if (!pinned || !el) return;
    // Scroll to the middle of that step's slice of the pinned scene.
    const travel = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + travel * ((i + 0.5) / COUNT), behavior: "smooth" });
  };

  return (
    <section ref={ref} id="how-it-works" aria-labelledby="how-it-works-title" className={cn("relative scroll-mt-24", pinned && "h-[320vh]")}>
      <div className={cn("mx-auto flex w-full max-w-7xl flex-col px-4 py-24 sm:px-8 sm:py-32", pinned && "sticky top-0 h-dvh justify-center sm:py-0")}>
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
              <p key={`${item.id}-body`} className="mt-3 max-w-md animate-fade-up text-[17px] leading-relaxed text-cream-200 motion-reduce:animate-none">
                {item.body}
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

          {/* The 3D bench: on phones a card; pinned on wide screens it stands bare on the dark, the whole bench always in frame. The step's tag and verdict sit over it, the reality line under it. */}
          <div className="relative order-3 flex flex-col gap-4 lg:order-none">
            <div className="relative">
              <HowBench3D bench={bench} stepKey={step} label={benchLabel(bench)} bare={pinned} className={cn("aspect-[16/11] rounded-frame ring-1 ring-robo-gold/30", pinned && "lg:aspect-auto lg:h-[min(56dvh,34rem)] lg:rounded-none lg:ring-0")} />
              <div className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap items-start justify-between gap-3 sm:inset-x-6 sm:top-6">
                <span key={bench.tag} className="paper-card inline-flex h-9 animate-pop-in items-center rounded-full px-3.5 text-[14px] font-semibold text-ink-900 motion-reduce:animate-none">
                  {bench.tag}
                </span>
                {bench.verdict && (
                  <span key={`${step}-${bench.verdict}`} className={cn("inline-flex h-9 animate-pop-in items-center gap-2 rounded-full px-3.5 text-[14px] font-semibold motion-reduce:animate-none", bench.verdict === "correct" ? "bg-verify-100 text-verify-700" : "bg-anomaly-100 text-anomaly-700")}>
                    <span aria-hidden className={cn("size-2 rounded-full", bench.verdict === "correct" ? "bg-verify-500" : "bg-anomaly-500")} />
                    {bench.verdict === "correct" ? "Right!" : "Surprise!"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex min-h-11 flex-wrap items-center gap-2 text-[15px] lg:justify-center">
              {bench.run ? (
                <>
                  <span className="text-cream-200/70">What really happened</span>
                  <span className="font-semibold text-white">{bench.run.answer}</span>
                  {bench.ghost && (
                    <>
                      <span aria-hidden className="mx-1 text-cream-200/40">·</span>
                      <span className="text-cream-200/70">Your guess</span>
                      <span className="font-semibold text-robo-teal">{bench.ghost.answer}</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className="mr-1 text-cream-200/70">When you press Run, the LED will…</span>
                  {sequence.options.map((o) => (
                    <span key={o} className={cn("inline-flex h-9 items-center rounded-full px-3.5 font-semibold", o === sequence.guess ? "bg-robo-gold text-ink-900" : "bg-white/10 text-cream-100")}>
                      {o}
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** What the bench shows, for screen readers. */
function benchLabel(b: HowSequence["steps"][number]): string {
  const parts = [`LED circuit, LED ${b.flipped ? "backwards" : "the right way round"}, ${b.slot === "empty" ? "nothing" : `a ${b.slot}`} in the resistor's place.`];
  if (b.run) parts.push(`What really happened: ${b.run.answer}, ${b.run.mA.toFixed(1)} milliamps.`);
  if (b.ghost) parts.push(`Your guess: ${b.ghost.answer}.`);
  return parts.join(" ");
}
