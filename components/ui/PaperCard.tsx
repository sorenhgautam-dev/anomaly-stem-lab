import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/*
 * Paper card (DESIGN.md §5): solid white, a crisp ink edge, fine grain and a
 * short warm shadow (the paper-card utility).
 * `float` adds the gentle idle bob (±6 px); give each card its own `phase`
 * (seconds) so they never move in step.
 */

export function PaperCard({
  float = false,
  phase = 0,
  className,
  style,
  ...rest
}: ComponentProps<"div"> & { float?: boolean; phase?: number }) {
  return (
    <div
      {...rest}
      className={cn("paper-card rounded-card p-5 text-ink-900", float && "animate-float motion-reduce:animate-none", className)}
      // The phase differs per card, so it can't be a static class.
      style={float ? { ...style, animationDelay: `${-phase}s` } : style}
    />
  );
}
