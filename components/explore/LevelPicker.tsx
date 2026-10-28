"use client";

import { ViewTransition, startTransition, useDeferredValue, useState } from "react";
import type { LevelId } from "@/engine/types";
import { cn } from "@/lib/cn";
import { curly } from "@/lib/typography";
import { resumeAudio, tileClack, whoosh } from "@/lib/sound";
import { Button } from "@/components/ui/Button";
import { Tilt } from "@/components/ui/Tilt";
import { ScrollCount } from "@/components/ui/ScrollCount";
import { ElementTile, MiniTile } from "./ElementTile";
import { LevelShelf } from "./LevelShelf";
import { levelForGrade, LevelKnob } from "./LevelKnob";
import type { LevelPick } from "./level-picks";

/** Each lab's colour as a small dot (DESIGN.md §3.2). */
const LAB_DOT: Record<string, string> = { cell: "bg-chem-wall", prevention: "bg-chem-gold", detection: "bg-robo-teal", treatment: "bg-robo-gold" };

/*
 * Pick a level like setting an instrument (DESIGN.md §7.2): turn the level
 * knob to your grade (or go straight to a level with its small element
 * tile) and the big periodic-table tile beside it flips over to that level
 * with a clack: its symbol, grade range, name and real experiment count.
 * Beside that, how many beliefs the level breaks with one of them as a
 * teaser, and a plain Start. The level's experiments stand on a shelf below
 * as real apparatus.
 *
 * `morph` (the level select page): the tile carries the level's name, so it
 * grows into the lab select page's frame (§9). `onLevel` lets the page react
 * to each new level.
 */

export type { LevelPick };

const START_GRADE = 9;

export function LevelPicker({ levels, morph = false, onLevel, className }: { levels: LevelPick[]; morph?: boolean; onLevel?: (level: LevelId) => void; className?: string }) {
  const [grade, setGrade] = useState(START_GRADE);
  // The knob answers at once; the level it lands on (tile, readout, shelf of 3D models, Ano) follows as a
  // deferred render, so a new level never freezes the knob for a frame (it cost up to ~200 ms).
  const id = useDeferredValue(levelForGrade(grade));
  const level = levels.find((l) => l.id === id)!;

  const onGrade = (g: number) => {
    resumeAudio();
    setGrade(g);
    const next = levelForGrade(g);
    if (next === levelForGrade(grade)) return;
    tileClack();
    startTransition(() => onLevel?.(next));
  };

  // The tile tilts toward the cursor with its symbol floating above it (pattern studied from Aceternity's "3D Card Effect", our own code).
  const tile = (
    <Tilt degrees={8} lift={8} innerClassName="rounded-card">
      <ElementTile key={id} level={level} />
    </Tilt>
  );
  return (
    <div className={cn("flex flex-col gap-12", className)}>
      {/*
       * One instrument read left to right: set the knob, see the tile, start.
       * On wide screens the three share a top edge, the row starts on the
       * page's left edge, and the knob column (knob and mini tiles) is as tall
       * as the tile, so Start lands on the tile's bottom edge.
       */}
      <div className="grid gap-10 lg:grid-cols-[19rem_21.5rem_minmax(0,1fr)] lg:gap-x-16">
        <div className="flex w-full flex-col items-center gap-5">
          <LevelKnob grade={grade} onGrade={onGrade} label="Your grade" className="max-w-[18rem] sm:max-w-[22rem] lg:max-w-none" />
          <div className="flex flex-col items-center gap-2">
            <span className="text-[15px] text-ink-500">Or go straight to</span>
            <div className="flex gap-3">
              {levels.map((l) => (
                <MiniTile key={l.id} level={l} active={l.id === id} />
              ))}
            </div>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[17rem] [perspective:1200px] sm:max-w-[20rem] lg:mx-0 lg:max-w-none">
          {morph ? (
            // The tile grows into the lab select page's frame (DESIGN.md §9).
            <ViewTransition name={`level-${id}`} share="morph" default="none">
              <div>{tile}</div>
            </ViewTransition>
          ) : (
            tile
          )}
        </div>
        <div className="mx-auto flex w-full max-w-[22rem] flex-col gap-6 lg:mx-0 lg:max-w-none lg:justify-between">
          {/* The level as a readout: how many beliefs it breaks, three of them, and how its experiments split between the labs. */}
          <div key={`${id}-beliefs`} className="animate-pop-in motion-reduce:animate-none">
            <p className="flex items-end gap-3">
              <ScrollCount value={level.beliefs} className="type-hero text-[clamp(4.5rem,7vw,6.5rem)] leading-[0.78]" />
              <span className="type-heading pb-1 text-[clamp(1.4rem,2vw,1.8rem)] leading-tight">
                tricky ideas
                <br />
                to test
              </span>
            </p>
            <ol aria-label="Three of them" className="mt-5 divide-y divide-ink-900/10 border-y border-ink-900/10">
              {level.teasers.map((t, i) => (
                <li key={t} className="flex items-baseline gap-4 py-2.5 text-[16px] leading-snug text-ink-900">
                  <span className="type-readout text-[12px] text-ink-500">{String(i + 1).padStart(2, "0")}</span>
                  <span>“{curly(t)}.”</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] text-ink-700">
              {level.labs
                .filter((l) => l.count > 0)
                .map((l) => (
                  <span key={l.id} data-level-lab={l.id} className="inline-flex items-center gap-2">
                    <span aria-hidden className={cn("size-2.5 rounded-full", LAB_DOT[l.id])} />
                    <strong className="font-semibold text-ink-900">{l.count}</strong> {l.title}
                  </span>
                ))}
            </p>
          </div>
          <Button
            href={`/start/${id}`}
            size="lg"
            aria-label={`Start ${level.title}`}
            className="w-full"
            onClick={() => {
              resumeAudio();
              whoosh();
            }}
          >
            Start
          </Button>
        </div>
      </div>
      <section aria-label={`${level.title} experiments`}>
        <p className="mb-1 text-center text-[15px] text-ink-500">
          On the {level.title} shelf: <span className="font-semibold text-ink-900">{level.count} {level.count === 1 ? "experiment" : "experiments"}</span>
        </p>
        {/* Every level's shelf stays built and only this level's shows, so turning the knob never builds 3D models mid-turn. */}
        {levels.map((l) => (
          <div key={l.id} hidden={l.id !== id}>
            <LevelShelf experiments={l.experiments} />
          </div>
        ))}
      </section>
    </div>
  );
}
