"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { softClick, resumeAudio } from "@/lib/sound";

/*
 * Toggles are pills (DESIGN.md §5). SegmentedToggle picks one of a few
 * options ("Open" / "Sealed"); the active one becomes a white pill. Switch
 * turns one thing on or off.
 */

export function SegmentedToggle<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const pick = (i: number) => {
    resumeAudio();
    softClick();
    onChange(options[i].value);
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
    <div role="radiogroup" aria-label={label} className={cn("inline-grid h-12 max-w-full auto-cols-max grid-flow-col gap-1 overflow-x-auto rounded-full bg-ink-900/[0.06] p-0.5", className)}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          onClick={() => pick(i)}
          onKeyDown={(e) => onKey(e, i)}
          className={cn(
            "whitespace-nowrap rounded-full px-3.5 text-sm font-semibold sm:px-4 outline-none transition-[background-color,box-shadow,color] duration-300 ease-out-soft",
            i === index ? "bg-white text-ink-900 shadow-warm-sm" : "text-ink-500 hover:bg-white/60 hover:text-ink-900",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ label, checked, onChange, className }: { label: string; checked: boolean; onChange: (checked: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        resumeAudio();
        softClick();
        onChange(!checked);
      }}
      className={cn("group inline-flex h-11 items-center gap-3 rounded-full bg-white pl-1.5 pr-4 text-sm font-semibold text-ink-900 shadow-warm-sm outline-none transition-shadow duration-300 hover:shadow-warm", className)}
    >
      <span aria-hidden className={cn("relative h-8 w-[3.25rem] rounded-full transition-colors duration-300", checked ? "bg-ribbon" : "bg-cream-200")}>
        <span className={cn("absolute left-1 top-1 size-6 rounded-full bg-white shadow-warm-sm transition-transform duration-300 ease-spring", checked && "translate-x-5")} />
      </span>
      {label}
    </button>
  );
}
