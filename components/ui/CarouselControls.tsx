"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./IconButton";

/*
 * Carousel controls (DESIGN.md §2 P6, §5): round arrow buttons and dots. The
 * active dot is an 18 px ink pill, the others 6 px dots. Each dot sits on its
 * own faint 44 px disc, which is its visible and clickable area
 * (CLAUDE.md §10.1: what you see is what you can click).
 */

export function CarouselControls({
  count,
  index,
  onSelect,
  label,
  className,
}: {
  count: number;
  index: number;
  onSelect: (index: number) => void;
  /** What the slides are, for screen readers ("Featured anomaly"). */
  label: string;
  className?: string;
}) {
  const go = (i: number) => onSelect((i + count) % count);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <IconButton label={`Previous ${label.toLowerCase()}`} onClick={() => go(index - 1)}>
        <ArrowLeft />
      </IconButton>
      <IconButton label={`Next ${label.toLowerCase()}`} onClick={() => go(index + 1)}>
        <ArrowRight />
      </IconButton>
      <div className="ml-1 flex items-center" role="group" aria-label={`${label}s`}>
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`${label} ${i + 1} of ${count}`}
            aria-current={i === index ? "true" : undefined}
            className="group grid size-11 place-items-center rounded-full bg-ink-900/[0.04] outline-none transition-colors duration-200 hover:bg-ink-900/[0.09]"
          >
            <span
              aria-hidden
              className={cn(
                "block h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out-soft",
                i === index ? "w-[18px] bg-ink-900" : "w-1.5 bg-ink-300 group-hover:bg-ink-500",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
