"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/*
 * Slider (DESIGN.md §5): a gradient track that fills up to a white thumb.
 * Native range input, so keyboard and screen readers work as expected.
 */

const FILL: Record<"chem" | "robo" | "ribbon", string> = {
  chem: "var(--color-apricot-400), var(--color-apricot-600)",
  robo: "var(--color-volt-400), var(--color-volt-600)",
  ribbon: "var(--color-apricot-300), var(--color-apricot-500)",
};

export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  tint = "ribbon",
  className,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
  tint?: "chem" | "robo" | "ribbon";
  className?: string;
}) {
  const id = useId();
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-ink-900">
          {label}
        </label>
        <output htmlFor={id} className="type-readout text-sm text-ink-700">
          {value}
          {unit ? ` ${unit}` : ""}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "h-11 w-full cursor-pointer appearance-none bg-transparent outline-none",
          "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:[background:var(--track)]",
          "[&::-webkit-slider-thumb]:-mt-2.5 [&::-webkit-slider-thumb]:size-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ink-900/10 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-warm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-200 active:[&::-webkit-slider-thumb]:scale-110",
          "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:[background:var(--track)]",
          "[&::-moz-range-thumb]:size-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ink-900/10 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-warm",
          "focus-visible:[&::-webkit-slider-thumb]:outline-2 focus-visible:[&::-webkit-slider-thumb]:outline-volt-500",
        )}
        // The fill follows the value, so it's set per render, not as a class.
        style={{ ["--track" as string]: `linear-gradient(90deg, ${FILL[tint]}) 0 / ${pct}% 100% no-repeat, var(--color-cream-200)` }}
      />
    </div>
  );
}
