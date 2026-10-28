import type { ReactNode } from "react";
import { IconCheck, IconClose } from "@/components/icons/icons";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/*
 * Chips (DESIGN.md §5): 24 px tall, fully round, 12 px semibold. Confidence
 * chips use the ramps' light ends; verdict status adds an icon so the meaning
 * never rests on colour alone.
 */

const chip = cva("inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 font-sans text-xs font-semibold leading-none", {
  variants: {
    tone: {
      // apricot-700 on apricot-100 is 4.2:1, under WCAG AA for 12 px text, so
      // the warm chips use ink-700 (DESIGN.md §3: all text passes AA).
      high: "bg-apricot-100 text-ink-700",
      medium: "bg-chem-wall/10 text-chem-wall",
      low: "bg-cream-200 text-ink-700",
      verified: "bg-verify-100 text-verify-700",
      anomaly: "bg-anomaly-100 text-anomaly-700",
      neutral: "bg-ink-900/[0.06] text-ink-700",
      chem: "bg-apricot-100 text-ink-700",
      robo: "bg-volt-100 text-volt-600",
      dark: "bg-ink-900 text-white",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type ChipTone = NonNullable<VariantProps<typeof chip>["tone"]>;

export function Chip({ tone, children, className }: { tone?: ChipTone; children: ReactNode; className?: string }) {
  return <span className={cn(chip({ tone }), className)}>{children}</span>;
}

export type Confidence = "High" | "Medium" | "Low";

const CONFIDENCE_TONE: Record<Confidence, ChipTone> = { High: "high", Medium: "medium", Low: "low" };
/** How sure the student said they were, in their words (never Ano's: his diagnosis has its own wording). */
const CONFIDENCE_WORDS: Record<Confidence, string> = { High: "You were sure", Medium: "You were fairly sure", Low: "You were guessing" };

export function ConfidenceChip({ level, className }: { level: Confidence; className?: string }) {
  return (
    <Chip tone={CONFIDENCE_TONE[level]} className={className}>
      {CONFIDENCE_WORDS[level]}
    </Chip>
  );
}

export type Status = "verified" | "anomaly";

/** A verdict: dot plus label, and a tick or a cross. */
export function StatusDot({ status, label, className }: { status: Status; label?: string; className?: string }) {
  const verified = status === "verified";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", verified ? "text-verify-700" : "text-anomaly-700", className)}>
      <span aria-hidden className={cn("grid size-4 place-items-center rounded-full text-white", verified ? "bg-verify-500" : "bg-anomaly-500")}>
        {verified ? <IconCheck className="size-2.5" /> : <IconClose className="size-2.5" />}
      </span>
      {label ?? (verified ? "Right" : "Surprise")}
    </span>
  );
}
