"use client";

import { useState } from "react";
import { AnoView } from "@/components/ano/AnoView";
import { EXPRESSIONS, MOVES, type AnoAction, type AnoExpression, type AnoPose } from "@/components/ano/types";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { Sunrise } from "@/components/ui/Sunrise";
import { SegmentedToggle, Switch } from "@/components/ui/Toggle";
import { speak, useVoice } from "@/lib/voice";
import { Section } from "./Section";

/* Ano (DESIGN.md §6): every expression, and a playground for every move. */

const LINES: Record<AnoExpression, string> = {
  happy: "Hey, I'm Ano. Want to break some science?",
  curious: "Nice. What do you think will happen?",
  thinking: "Hmm, let me look at the one part that matters.",
  surprised: "Whoa, did you see that? Let's figure out why.",
  celebrating: "Nailed it! That's exactly how a scientist thinks.",
};

export function AnoDemo() {
  const [expression, setExpression] = useState<AnoExpression>("happy");
  const [action, setAction] = useState<AnoAction | null>({ move: "wave", key: 0 });
  const [pose, setPose] = useState<AnoPose>("stand");
  const [talking, setTalking] = useState(false);
  const voiceOn = useVoice((s) => s.speaking !== null);

  return (
    <Section id="ano" title="Ano" note="Built from primitives in code. Head follows the cursor, blinks and breathes; click near Ano for a boop.">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[...EXPRESSIONS, "speaking" as const].map((e) => (
          <GlassCard key={e} className="flex flex-col items-center p-3">
            <AnoView className="h-56 w-full" framing="bust" expression={e === "speaking" ? "happy" : e} speaking={e === "speaking"} />
            <p className="mt-1 text-sm font-semibold capitalize">{e}</p>
          </GlassCard>
        ))}
      </div>

      <div className="relative mt-8 grid items-center gap-8 overflow-hidden rounded-frame p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
        <Sunrise />
        <AnoView className="relative h-[26rem]" expression={expression} action={action} pose={pose} speaking={talking || voiceOn} label="Ano, the ANOMALY lab partner" />
        <div className="relative flex flex-col gap-5">
          <SpeechBubble text={LINES[expression]} tail="left" />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Expression">
            {EXPRESSIONS.map((e) => (
              <Button key={e} size="md" variant={e === expression ? "primary" : "secondary"} aria-pressed={e === expression} onClick={() => setExpression(e)} className="capitalize">
                {e}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Move">
            {MOVES.map((m) => (
              <Button key={m} size="md" variant="secondary" onClick={() => setAction((a) => ({ move: m, key: (a?.key ?? 0) + 1 }))} className="capitalize">
                {m}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedToggle
              label="Pose"
              value={pose}
              onChange={setPose}
              options={[
                { value: "stand", label: "Stand" },
                { value: "peek", label: "Peek" },
              ]}
            />
            <Switch label="Talk bars" checked={talking} onChange={setTalking} />
            <Button variant="ghost" onClick={() => void speak(LINES[expression])}>
              Say it
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
