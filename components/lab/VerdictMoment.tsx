"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import anoLines from "@/content/ano-lines.json";
import { cn } from "@/lib/cn";

/*
 * The verdict's giant word (DESIGN.md §7.5, §8.1 "Reveal"), over the 3D lab
 * and never blocking it. Correct: a verify-green check and "NAILED IT." (or a
 * variation) whose letters assemble out of depth in the Win ramp. Wrong: a
 * scanline flash and "ANOMALY." slamming in with an RGB-split glitch. Both
 * leave after a moment; reduced motion keeps a plain fade.
 */

const WIN = ["var(--color-verify-700)", "var(--color-volt-600)"];
const GLITCH = ["var(--color-anomaly-500)", "var(--color-flame-500)"];

function Word({ text, ramp, assemble }: { text: string; ramp: string[]; assemble: boolean }) {
  const letters = Array.from(text);
  return (
    <p aria-hidden className="type-hero whitespace-nowrap text-center text-[clamp(4rem,15vw,12rem)] [perspective:900px]">
      {letters.map((ch, i) => {
        const k = letters.length > 1 ? i / (letters.length - 1) : 0;
        return (
          <span
            key={i}
            className={cn("inline-block whitespace-pre motion-reduce:animate-none", assemble ? "animate-assemble" : "animate-slam")}
            // Each letter has its own colour along the ramp and its own entrance delay.
            style={{ color: `color-mix(in oklab, ${ramp[0]} ${Math.round((1 - k) * 100)}%, ${ramp[1]})`, animationDelay: `${assemble ? i * 45 : 0}ms`, ["--assemble-x" as string]: `${(k - 0.5) * 220}px`, ["--assemble-r" as string]: `${(k - 0.5) * 80}deg` }}
          >
            {ch}
          </span>
        );
      })}
    </p>
  );
}

export function VerdictMoment({ moment }: { moment: { id: number; verdict: "correct" | "wrong"; levelUp: boolean } | null }) {
  const [shown, setShown] = useState<typeof moment>(null);
  useEffect(() => {
    if (!moment) return;
    const show = window.setTimeout(() => setShown(moment), 0);
    const hide = window.setTimeout(() => setShown(null), moment.verdict === "correct" ? 2300 : 1900);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [moment]);
  if (!shown) return null;
  const correct = shown.verdict === "correct";
  const words = anoLines.headlines.correct;
  const text = shown.levelUp ? "Level up!" : correct ? words[shown.id % words.length].replace(/\.$/, "") + "." : "Anomaly.";
  return (
    <div key={shown.id} role="status" aria-live="assertive" className="pointer-events-none fixed inset-0 z-50 flex animate-verdict flex-col items-center justify-center gap-4 motion-reduce:animate-none">
      <span className="sr-only">{correct ? "Correct prediction" : "Anomaly detected: reality disagreed with your prediction"}</span>
      {!correct && <span aria-hidden className="absolute inset-0 animate-scanflash bg-[repeating-linear-gradient(to_bottom,color-mix(in_oklab,var(--color-anomaly-500)_14%,transparent)_0_1px,transparent_1px_4px)] motion-reduce:hidden" />}
      {correct && (
        <span aria-hidden className="grid size-20 animate-pop-in place-items-center rounded-full bg-verify-500 text-white shadow-warm-lg">
          <Check className="size-10" strokeWidth={3} />
        </span>
      )}
      <div className={cn(!correct && "animate-glitch")}>
        <Word text={text.toUpperCase()} ramp={correct ? WIN : GLITCH} assemble={correct} />
      </div>
    </div>
  );
}
