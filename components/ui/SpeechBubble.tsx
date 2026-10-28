"use client";

import type { ReactNode } from "react";
import { IconSpeaker } from "@/components/icons/icons";
import { cn } from "@/lib/cn";
import { WordReveal } from "./WordReveal";
import { speak, stopSpeaking, useVoice } from "@/lib/voice";
import { isMuted } from "@/lib/sound";
import { toast } from "./Toast";

/*
 * Ano's speech bubble (DESIGN.md §5): a white card with a small tail toward
 * Ano, Schibsted Grotesk 15–16 px, and a Listen button. The text is the caption, so it's
 * always on screen while the line is spoken (CLAUDE.md §7.4).
 */

const TAIL: Record<"left" | "bottom" | "top", string> = {
  left: "-left-1.5 top-6 rotate-45",
  bottom: "-bottom-1.5 left-8 rotate-45",
  top: "-top-1.5 left-8 rotate-45",
};

export function SpeechBubble({
  text,
  tail = "left",
  fromAi = false,
  listen = true,
  name = "Ano",
  children,
  className,
  tailClassName,
}: {
  text: string;
  tail?: "left" | "bottom" | "top";
  /** An Ask Ano answer: Listen tries Ano's server voice first. */
  fromAi?: boolean;
  listen?: boolean;
  name?: string;
  children?: ReactNode;
  className?: string;
  /** Extra classes for the tail (e.g. hiding it while Ano is away). */
  tailClassName?: string;
}) {
  const speaking = useVoice((s) => s.speaking === text);
  return (
    <div className={cn("relative rounded-card bg-white p-4 text-ink-900 shadow-warm", className)} aria-live="polite">
      <span aria-hidden className={cn("absolute size-3 rounded-[3px] bg-white", TAIL[tail], tailClassName)} />
      <div className="relative flex items-center justify-between gap-3">
        <p className="type-label text-apricot-700">{name}</p>
        {listen && (
          <button
            type="button"
            onClick={() => (speaking ? stopSpeaking() : isMuted() ? toast("Sound is off. Turn it on at the top to hear Ano.") : void speak(text, { fromAi }))}
            aria-pressed={speaking}
            className="-my-2 -mr-2 inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-700 transition-colors hover:bg-ink-900/[0.06] hover:text-ink-900"
          >
            {speaking ? <TalkBars /> : <IconSpeaker aria-hidden className="size-4" />}
            {speaking ? "Stop" : "Listen"}
          </button>
        )}
      </div>
      {/* The line appears word by word, like it's being said; re-keyed so each new line plays. */}
      <p key={text} className="relative mt-1.5 text-[15px] leading-[1.5] text-ink-900">
        <WordReveal text={text} />
      </p>
      {children && <div className="relative mt-3 flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/** Animated sound bars while Ano speaks. */
export function TalkBars({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex h-4 items-center gap-[3px]", className)}>
      {[0, 160, 80, 240].map((delay) => (
        <span
          key={delay}
          className="h-full w-[3px] origin-center animate-talk rounded-full bg-apricot-500 motion-reduce:animate-none"
          // Each bar moves on its own beat.
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
