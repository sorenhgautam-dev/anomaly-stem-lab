"use client";

import { useState } from "react";
import landing from "@/content/landing.json";
import { AnoView } from "@/components/ano/AnoView";
import { EXPRESSIONS, type AnoAction, type AnoExpression, type AnoMove } from "@/components/ano/types";
import { FaceIcon } from "@/components/ano/FaceIcon";
import { cn } from "@/lib/cn";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { Paper } from "@/components/ui/Paper";
import { Switch } from "@/components/ui/Toggle";
import { speak, useVoice } from "@/lib/voice";
import { SectionHeading } from "./SectionHeading";

/*
 * Meet Ano (DESIGN.md §7.1): Ano with a row of his own visor faces the
 * visitor can click to change his expression, and the voice toggle (off by
 * default, CLAUDE.md §7.4).
 */

const M = landing.meetAno;
const MOVE: Record<AnoExpression, AnoMove> = { happy: "wave", curious: "boop", thinking: "nod", surprised: "hop", celebrating: "spin" };

export function MeetAno() {
  const [expression, setExpression] = useState<AnoExpression>("happy");
  const [action, setAction] = useState<AnoAction | null>(null);
  const voice = useVoice((s) => s.enabled);
  const setVoice = useVoice((s) => s.setEnabled);
  const speaking = useVoice((s) => s.speaking !== null);
  const line = M.lines[expression];

  const pick = (e: AnoExpression) => {
    setExpression(e);
    setAction((a) => ({ move: MOVE[e], key: (a?.key ?? 0) + 1 }));
    if (voice) void speak(M.lines[e]);
  };

  return (
    <section aria-labelledby="meet-ano" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pb-24 pt-10 sm:px-8 sm:pb-32 sm:pt-12">
      <div className="relative grid items-center gap-8 overflow-hidden rounded-frame p-6 shadow-warm ring-1 ring-ink-900/[0.05] sm:p-10 lg:grid-cols-2 lg:p-14">
        <Paper />
        <AnoView className="reveal relative h-[24rem] sm:h-[30rem]" expression={expression} action={action} speaking={speaking} label={`Ano looking ${expression}`} />
        <div className="relative flex flex-col gap-6">
          <SectionHeading id="meet-ano" title={M.title}>
            {M.body}
          </SectionHeading>
          <SpeechBubble text={line} tail="left" className="max-w-lg" />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Ano's expression">
            {EXPRESSIONS.map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={e === expression}
                onClick={() => pick(e)}
                className={cn(
                  "group flex flex-col items-center gap-1.5 rounded-card px-2.5 py-2 outline-none transition-[background-color,translate] duration-200 ease-spring hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2",
                  e === expression ? "bg-white shadow-warm-sm" : "hover:bg-white/60",
                )}
              >
                <FaceIcon expression={e} className={cn("h-9 w-16 transition-transform duration-200 ease-spring", e === expression && "scale-110")} />
                <span className={cn("text-[13px] font-semibold capitalize", e === expression ? "text-ink-900" : "text-ink-500")}>{e}</span>
              </button>
            ))}
          </div>
          <Switch
            label={M.voice}
            checked={voice}
            onChange={(on) => {
              setVoice(on);
              if (on) void speak(line);
            }}
            className="w-fit"
          />
        </div>
      </div>
    </section>
  );
}
