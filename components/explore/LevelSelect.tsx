"use client";

import { useState } from "react";
import type { AnoAction, AnoExpression, AnoMove } from "@/components/ano/types";
import type { LevelId } from "@/engine/types";
import { HeadlineWithAno } from "./HeadlineWithAno";
import { LevelPicker, type LevelPick } from "./LevelPicker";

/*
 * The level select page (DESIGN.md §7.2): the headline with Ano standing in
 * its gap, and the picker under it. Ano waves when the page opens and reacts
 * each time the knob lands on a new level, with a move and a face to match
 * (a hop for Easy, a nod for Medium, a spin for Advanced); his bubble changes
 * to that level's line.
 */

const FACE: Record<LevelId, AnoExpression> = { easy: "happy", medium: "curious", advanced: "surprised" };
const MOVE: Record<LevelId, AnoMove> = { easy: "hop", medium: "nod", advanced: "spin" };

export function LevelSelect({ levels, intro }: { levels: LevelPick[]; intro: string }) {
  const [level, setLevel] = useState<LevelId>("medium");
  const [line, setLine] = useState(intro);
  const [action, setAction] = useState<AnoAction>({ move: "wave", key: 1 });
  return (
    <>
      <HeadlineWithAno left="Pick" right="your level." line={line} expression={FACE[level]} action={action} sizeClassName="text-[clamp(4rem,19vw,6.5rem)] md:text-[clamp(4rem,9.5vw,9rem)]" />
      <div className="relative z-20 animate-card-in [transform-origin:50%_100%] motion-reduce:animate-none">
        <LevelPicker
          levels={levels}
          morph
          className="mt-8 md:mt-10"
          onLevel={(next) => {
            setLevel(next);
            setLine(levels.find((l) => l.id === next)?.ano ?? intro);
            setAction((a) => ({ move: MOVE[next], key: a.key + 1 }));
          }}
        />
      </div>
    </>
  );
}
