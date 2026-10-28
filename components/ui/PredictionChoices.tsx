"use client";

import { useRef, type KeyboardEvent } from "react";
import { IconCheck } from "@/components/icons/icons";
import { cn } from "@/lib/cn";
import { softClick, resumeAudio } from "@/lib/sound";

/*
 * Prediction choices (DESIGN.md §5): large white option cards. The chosen one
 * gets a 2 px gradient ring in its lab's colours and a tick. A radio group:
 * arrow keys move between options, Space or Enter picks one.
 */

export function PredictionChoices({
  question,
  options,
  value,
  onChange,
  lab,
  className,
}: {
  question: string;
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
  lab: "chemistry" | "robotics";
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = value === null ? -1 : options.indexOf(value);

  const pick = (i: number) => {
    resumeAudio();
    softClick();
    onChange(options[i]);
  };

  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + options.length) % options.length;
    refs.current[next]?.focus();
    pick(next);
  };

  return (
    <div role="radiogroup" aria-label={question} data-prediction className={cn("grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))]", className)}>
      {options.map((option, i) => {
        const selected = i === current;
        return (
          <button
            key={option}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (current === -1 && i === 0) ? 0 : -1}
            onClick={() => pick(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "group relative flex min-h-14 items-center justify-between gap-3 rounded-card p-[2px] text-left outline-none transition-shadow duration-300 ease-out-soft",
              selected ? (lab === "chemistry" ? "bg-chem shadow-warm" : "bg-robo shadow-warm") : "bg-ink-900/[0.07] shadow-warm-sm hover:shadow-warm",
            )}
          >
            <span className="flex h-full w-full items-center justify-between gap-3 rounded-[calc(var(--radius-card)-2px)] bg-white px-4 py-3">
              <span className="text-[15px] font-semibold leading-tight text-ink-900">{option}</span>
              <span
                aria-hidden
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full transition-[transform,background-color] duration-300 ease-spring",
                  selected ? "scale-100 bg-ink-900 text-white" : "scale-90 bg-cream-100 text-transparent ring-1 ring-ink-900/10",
                )}
              >
                <IconCheck className="size-3.5" />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
