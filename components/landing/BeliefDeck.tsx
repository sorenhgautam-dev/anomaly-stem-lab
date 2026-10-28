"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { IconArrowLeft, IconArrowRight } from "@/components/icons/icons";
import { cn } from "@/lib/cn";
import { beliefStatus, type BeliefItem } from "@/lib/beliefs";
import { useProgress } from "@/lib/progress";
import { softClick, resumeAudio, whoosh } from "@/lib/sound";
import { BeliefShiftCard } from "@/components/ui/BeliefShiftCard";
import { IconButton } from "@/components/ui/IconButton";
import { RollingLetters } from "@/components/ui/RollingText";
import { useDeckDrag } from "./useDeckDrag";

/*
 * The belief deck (DESIGN.md §7.1 item 4): real Belief shift cards stacked
 * like paper, one in front. Drag or flick the front card away, or use the
 * arrows (and the arrow keys), and it slides to the back while the next one
 * comes forward. Patterns studied on Aceternity's card stack and draggable
 * card and on Skiper's card swipe carousel; our own code and paper styling.
 * Behind the front card, three more show at growing depth, each turned a
 * little the other way. Reduced motion swaps cards without the throw.
 *
 * Status comes from this browser's saved progress once it has loaded, so the
 * first render matches the server (CLAUDE.md §9).
 */

const DEPTH = 3;

export function BeliefDeck({ beliefs }: { beliefs: BeliefItem[] }) {
  const n = beliefs.length;
  const [top, setTop] = useState(0);
  const hydrated = useProgress((s) => s.hydrated);
  const broken = useProgress((s) => s.broken);
  const evidence = useProgress((s) => s.evidence);
  useEffect(() => {
    void useProgress.getState().hydrate();
  }, []);

  const onThrow = useCallback(() => {
    setTop((t) => (t + 1) % n);
    whoosh(0.32);
  }, [n]);
  const { card, fling, handlers } = useDeckDrag(onThrow);

  const next = () => {
    resumeAudio();
    fling(-1);
  };
  const previous = () => {
    resumeAudio();
    softClick();
    setTop((t) => (t - 1 + n) % n);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") next();
    else if (e.key === "ArrowLeft") previous();
    else return;
    e.preventDefault();
  };

  return (
    <div className="flex flex-col items-center gap-10 sm:flex-row sm:items-center sm:gap-12">
      <div
        role="group"
        aria-label={`Belief deck, card ${top + 1} of ${n}. Use the arrow keys to go through it.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative mb-6 h-[20rem] w-[calc(100%-2.5rem)] max-w-[28rem] shrink-0 rounded-card outline-none focus-visible:outline-2 focus-visible:outline-offset-8 sm:h-[19rem]"
      >
        {beliefs.map((b, i) => {
          const p = (i - top + n) % n;
          const front = p === 0;
          const d = Math.min(p, DEPTH);
          const status = hydrated ? beliefStatus(b.id, broken, evidence) : { tone: "untested" as const, label: "Not tested yet" };
          return (
            <div
              key={b.id}
              ref={front ? (el) => void (card.current = el) : undefined}
              aria-hidden={!front}
              inert={!front}
              {...(front ? handlers : {})}
              className={cn(
                "absolute inset-0 touch-pan-y select-none transition-[transform,opacity] duration-500 ease-spring motion-reduce:transition-none",
                front ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
                p > DEPTH && "opacity-0",
              )}
              // Each card's place in the stack depends on how far it is from the front: the fan alternates sides, so it stays inside the deck's own box.
              style={{ zIndex: n - p, transform: `translate3d(${(d % 2 ? -1 : 1) * d * 7}px, ${d * 13}px, 0) scale(${1 - d * 0.045}) rotate(${(d % 2 ? -1 : 1) * d * 2.2}deg)` }}
            >
              <BeliefShiftCard size="lg" eyebrow={b.where} title={b.title} detail={b.belief} tone={status.tone} statusLabel={status.label} href={front ? b.href : undefined} accent={b.lab === "chemistry" ? "chem" : "robo"} className={cn("h-full w-full shadow-paper", front && "shadow-paper-lift")} />
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-5 self-start sm:self-center">
        <p className="flex items-end gap-2" aria-hidden>
          <span key={top} data-roll="go" className="type-hero inline-block text-[clamp(3.5rem,6vw,5rem)] leading-[0.8]">
            <RollingLetters text={String(top + 1).padStart(2, "0")} />
          </span>
          <span className="type-readout pb-1 text-base text-ink-500">/ {String(n).padStart(2, "0")}</span>
        </p>
        <p className="max-w-xs text-[15px] leading-relaxed text-ink-700">Drag a card off the deck or use the arrows. Each one opens the experiment built to test it.</p>
        <div className="flex gap-3">
          <IconButton label="Previous idea" onClick={previous}>
            <IconArrowLeft />
          </IconButton>
          <IconButton label="Next idea" onClick={next}>
            <IconArrowRight />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
