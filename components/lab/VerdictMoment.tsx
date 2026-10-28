"use client";

import { useEffect, useState } from "react";
import { IconCheck } from "@/components/icons/icons";
import anoLines from "@/content/ano-lines.json";
import { cn } from "@/lib/cn";
import { fx } from "@/lib/fx";
import { letterPluck } from "@/lib/sound";

/*
 * The verdict's giant word (DESIGN.md §7.5, §8.1 "Reveal"), over the 3D lab
 * and never blocking it. Correct: a verify-green check and "NAILED IT." (or a
 * variation) whose letters assemble out of depth in the Win ramp. Wrong: a
 * scanline flash and "ANOMALY." slamming in with an RGB-split glitch. Both
 * leave after a moment; reduced motion keeps a plain fade.
 *
 * The beats land together (DESIGN.md §9.1): on a correct run a burst of
 * light leaves the check as it pops and a rising pluck plays as each letter
 * settles; on an ANOMALY the screen-space shards and a small shake hit as
 * the word slams in (the stutter and slam sound are timed to it in useRun).
 */

/** When a letter has visibly landed: its delay plus about half the assemble spring. */
const LETTER_STEP_MS = 45;
const LETTER_LAND_MS = 430;
/** When "ANOMALY." lands: the slam keyframe's 60 % mark. */
export const SLAM_LAND_MS = 310;
/** How long "ANOMALY." stays on screen before it leaves. */
export const WRONG_HOLD_MS = 1900;

// verify-500 is under 3:1 on cream, so the Win word uses its dark end, deepening toward ink.
const WIN = ["var(--color-verify-700)", "color-mix(in oklab, var(--color-verify-700) 70%, var(--color-ink-900))"];
const GLITCH = ["var(--color-anomaly-500)", "var(--color-anomaly-700)"];

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
            style={{ color: `color-mix(in oklab, ${ramp[0]} ${Math.round((1 - k) * 100)}%, ${ramp[1]})`, animationDelay: `${assemble ? i * LETTER_STEP_MS : 0}ms`, ["--assemble-x" as string]: `${(k - 0.5) * 220}px`, ["--assemble-r" as string]: `${(k - 0.5) * 80}deg` }}
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
    const hide = window.setTimeout(() => setShown(null), moment.verdict === "correct" ? 2300 : WRONG_HOLD_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [moment]);
  const correct = shown?.verdict === "correct";
  const words = anoLines.headlines.correct;
  const text = !shown ? "" : shown.levelUp ? "Level up!" : correct ? words[shown.id % words.length].replace(/\.$/, "") + "." : "Anomaly.";

  // The beats (see the note at the top).
  useEffect(() => {
    if (!shown) return;
    const at = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    if (shown.verdict === "correct") {
      fx.success({ x: at.x, y: at.y - 70 }, 1.1);
      let note = 0;
      Array.from(text).forEach((ch, i) => {
        if (ch.trim()) letterPluck(note++, (i * LETTER_STEP_MS + LETTER_LAND_MS) / 1000);
      });
      return;
    }
    const id = window.setTimeout(() => {
      fx.anomaly(at, 1.2);
      fx.shake(document.querySelector<HTMLElement>("[data-lab-hud]"), 1.2);
    }, SLAM_LAND_MS);
    return () => window.clearTimeout(id);
  }, [shown, text]);

  if (!shown) return null;
  return (
    <div key={shown.id} role="status" aria-live="assertive" className="pointer-events-none fixed inset-0 z-50 flex animate-verdict flex-col items-center justify-center gap-4 motion-reduce:animate-none">
      <span className="sr-only">{correct ? "You guessed right" : "Surprise: that’s not what you guessed"}</span>
      {correct && <span aria-hidden className="absolute inset-0 animate-win-bloom bg-[linear-gradient(to_top,color-mix(in_oklab,var(--color-verify-500)_18%,transparent),transparent_65%)] motion-reduce:hidden" />}
      {/* slop-ok: the ANOMALY glitch flashes scanlines for 0.9 s; a VFX beat, not a background pattern */}
      {!correct && <span aria-hidden className="absolute inset-0 animate-scanflash bg-[repeating-linear-gradient(to_bottom,color-mix(in_oklab,var(--color-anomaly-500)_14%,transparent)_0_1px,transparent_1px_4px)] motion-reduce:hidden" />}
      {correct && (
        <span aria-hidden className="grid size-20 animate-pop-in place-items-center rounded-full bg-verify-500 text-white shadow-warm-lg">
          <IconCheck className="size-10" />
        </span>
      )}
      <div className={cn(!correct && "animate-glitch")}>
        <Word text={text.toUpperCase()} ramp={correct ? WIN : GLITCH} assemble={correct} />
      </div>
      {/* The big word is the brand's moment; this line says it in plain words. */}
      {!correct && <p className="rounded-full bg-white px-4 py-1.5 text-[17px] font-semibold text-anomaly-700 shadow-warm">Surprise! That’s not what you guessed.</p>}
    </div>
  );
}
