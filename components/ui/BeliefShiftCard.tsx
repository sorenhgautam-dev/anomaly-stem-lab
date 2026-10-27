import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { GlassCard } from "./GlassCard";
import { IconButton } from "./IconButton";

/*
 * Belief shift card (DESIGN.md §2 P5, §5, §7.6): small caps eyebrow, bold
 * two-line title, one line of detail, a status dot and a corner arrow that
 * opens the experiment. Only the arrow is clickable, so there is one clear
 * target per card.
 */

export type BeliefTone = "broken" | "challenged" | "untested" | "verified" | "anomaly";

const DOT: Record<BeliefTone, string> = {
  broken: "bg-verify-500",
  verified: "bg-verify-500",
  challenged: "bg-apricot-500",
  anomaly: "bg-anomaly-500",
  untested: "bg-cream-300 ring-1 ring-ink-300",
};

const LABEL_TONE: Record<BeliefTone, string> = {
  broken: "text-verify-700",
  verified: "text-verify-700",
  challenged: "text-apricot-700",
  anomaly: "text-anomaly-700",
  untested: "text-ink-500",
};

export interface BeliefShiftCardProps {
  eyebrow?: string;
  title: string;
  detail: string;
  tone: BeliefTone;
  statusLabel: string;
  /** Where the corner arrow goes (the experiment that tests this belief). */
  href?: string;
  /** A thin top bar in the lab's gradient. */
  accent?: "chem" | "robo";
  float?: boolean;
  phase?: number;
  className?: string;
}

export function BeliefShiftCard({ eyebrow = "Belief shift", title, detail, tone, statusLabel, href, accent, float, phase, className }: BeliefShiftCardProps) {
  return (
    <GlassCard float={float} phase={phase} className={cn("relative w-72 overflow-hidden p-4", tone === "untested" && "bg-cream-50/90", className)}>
      {accent && <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", accent === "chem" ? "bg-chem" : "bg-robo")} />}
      <p className="type-eyebrow text-ink-500">{eyebrow}</p>
      <p className={cn("type-heading mt-2 line-clamp-2 text-lg leading-[1.12]", href && "pr-12")}>{title}</p>
      <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-ink-500">{detail}</p>
      <p className={cn("mt-3 inline-flex items-center gap-2 text-[13px] font-semibold", LABEL_TONE[tone])}>
        <span aria-hidden className={cn("size-2 rounded-full", DOT[tone])} />
        {statusLabel}
      </p>
      {href && (
        <IconButton href={href} label={`Open: ${title}`} size="sm" tone="dark" className="absolute right-3 top-3">
          <ArrowUpRight />
        </IconButton>
      )}
    </GlassCard>
  );
}
