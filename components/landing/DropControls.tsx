"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import landing from "@/content/landing.json";
import { Button } from "@/components/ui/Button";
import { PredictionChoices } from "@/components/ui/PredictionChoices";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { realAnswer, type DropGuess } from "./drop-sim";
import { useDrop } from "./drop-store";

/*
 * The hero teaser's controls, in the lower band's place: make your call,
 * drop the balls, then Ano's line and where to go next (CLAUDE.md §3.2).
 */

const H = landing.hero;

export function verdictFor(guess: DropGuess | null): "correct" | "wrong" | null {
  return guess ? (guess === realAnswer() ? "correct" : "wrong") : null;
}

export function labelFor(guess: DropGuess | null): string {
  return H.options.find((o) => o.id === guess)?.label ?? "—";
}

export function DropControls() {
  const phase = useDrop((s) => s.phase);
  const guess = useDrop((s) => s.guess);
  const setGuess = useDrop((s) => s.setGuess);
  const drop = useDrop((s) => s.drop);
  const again = useDrop((s) => s.again);
  const close = useDrop((s) => s.close);
  const verdict = verdictFor(guess);

  return (
    <div className="relative z-20 flex flex-col gap-5 px-4 pb-32 sm:px-8 sm:pb-40 md:pb-36">
      {phase === "result" ? (
        <div className="mt-4 grid animate-fade-up gap-5 motion-reduce:animate-none lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <SpeechBubble text={verdict === "correct" ? H.correctLine : H.wrong} tail="top" className="max-w-xl" />
          <div className="flex flex-wrap gap-2">
            <Button href="/start" size="lg" icon={<ArrowRight className="size-4" />}>
              {H.next}
            </Button>
            <Button variant="secondary" size="lg" onClick={again}>
              {H.retry}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)_auto] lg:items-end">
          <p className="max-w-md text-[15px] leading-relaxed text-ink-700 sm:text-base">{H.setup}</p>
          <PredictionChoices
            lab="chemistry"
            question={`${H.left} ${H.right}`}
            options={H.options.map((o) => o.label)}
            value={guess ? labelFor(guess) : null}
            onChange={(label) => setGuess((H.options.find((o) => o.label === label)?.id ?? "same") as DropGuess)}
          />
          <Button size="lg" onClick={drop} disabled={!guess || phase === "dropping"}>
            {phase === "dropping" ? "Watch closely…" : H.drop}
          </Button>
        </div>
      )}
      <Button variant="ghost" onClick={close} className="w-fit" icon={<ArrowLeft className="order-first size-4" />}>
        {H.back}
      </Button>
    </div>
  );
}
