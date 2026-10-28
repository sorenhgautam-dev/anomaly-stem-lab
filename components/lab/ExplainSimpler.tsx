"use client";

import { useState } from "react";
import { IconAsk } from "@/components/icons/icons";
import { hintsFor } from "@/lib/content";
import { useLab } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { askAnoRequest, useAskLeft } from "./useAskAno";

/*
 * "Explain it simpler" on an explanation (the theory's Why, the hint ladder).
 * It asks Ask Ano to re-explain that same text in easier words, grounded in
 * the same simulator facts, and it uses one of the five questions. If Ano
 * can't answer (no key, a limit, a failed call) the written "why it
 * happened" hint is shown instead: always something to read, never an error.
 */

export function ExplainSimpler({ text, className }: { text: string; className?: string }) {
  const left = useAskLeft((s) => s.left);
  const [reply, setReply] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const explain = async () => {
    setPending(true);
    const answer = await askAnoRequest("Can you explain that more simply?", "simpler", text);
    const { def, result } = useLab.getState();
    // Offline or no answer at all: the written rung is right here in the content.
    const fallback = def ? hintsFor(result?.diagnosis?.focus ?? def.misconceptions[0])?.hints[1] : undefined;
    setReply(answer?.text ?? fallback ?? "Try running it again and watch one number closely. What changes?");
    setPending(false);
  };

  return (
    <div className={className}>
      {reply ? (
        <p data-simpler className="rounded-tile bg-cream-100 px-3 py-2.5 text-[15px] leading-relaxed text-ink-900">
          <span className="font-semibold">Simpler: </span>
          {reply}
        </p>
      ) : (
        <Button variant="secondary" disabled={pending || left <= 0} onClick={explain} icon={<IconAsk aria-hidden className="size-4" />}>
          {pending ? "Thinking…" : left > 0 ? `Explain it simpler · ${left} left` : "No questions left"}
        </Button>
      )}
    </div>
  );
}
