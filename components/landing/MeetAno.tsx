"use client";

import { useState } from "react";
import landing from "@/content/landing.json";
import { AnoView } from "@/components/ano/AnoView";
import { EXPRESSIONS, type AnoAction, type AnoExpression, type AnoMove } from "@/components/ano/types";
import { Button } from "@/components/ui/Button";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { Sunrise } from "@/components/ui/Sunrise";
import { Switch } from "@/components/ui/Toggle";
import { speak, useVoice } from "@/lib/voice";
import { SectionHeading } from "./SectionHeading";

/*
 * Meet Ano (DESIGN.md §7.1): Ano with a row of expression buttons the visitor
 * can click, and the voice toggle (off by default, CLAUDE.md §7.4).
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
    <section aria-labelledby="meet-ano" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-24 sm:px-8 sm:py-32">
      <div className="relative grid items-center gap-8 overflow-hidden rounded-frame p-6 sm:p-10 lg:grid-cols-2 lg:p-14">
        <Sunrise />
        <AnoView className="reveal relative h-[24rem] sm:h-[30rem]" expression={expression} action={action} speaking={speaking} label={`Ano looking ${expression}`} />
        <div className="relative flex flex-col gap-6">
          <SectionHeading id="meet-ano" title={M.title}>
            {M.body}
          </SectionHeading>
          <SpeechBubble text={line} tail="left" className="max-w-lg" />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Ano's expression">
            {EXPRESSIONS.map((e) => (
              <Button key={e} variant={e === expression ? "primary" : "secondary"} aria-pressed={e === expression} onClick={() => pick(e)} className="capitalize">
                {e}
              </Button>
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
