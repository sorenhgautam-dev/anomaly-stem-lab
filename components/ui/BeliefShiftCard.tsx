import { IconArrowUpRight, IconFlask, IconRobot } from "@/components/icons/icons";
import { cn } from "@/lib/cn";
import { PaperCard } from "./PaperCard";
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
  /** The lab's mark beside the eyebrow, in the lab's own colour. */
  accent?: "chem" | "robo";
  float?: boolean;
  phase?: number;
  /** "lg" for the landing's belief deck: bigger type and more room. */
  size?: "md" | "lg";
  className?: string;
}

export function BeliefShiftCard({ eyebrow = "What you just learned", title, detail, tone, statusLabel, href, accent, float, phase, size = "md", className }: BeliefShiftCardProps) {
  const lg = size === "lg";
  return (
    <PaperCard float={float} phase={phase} className={cn("relative w-72 overflow-hidden", lg ? "flex flex-col p-6" : "p-4", tone === "untested" && "bg-cream-50", className)}>
      <p className="type-eyebrow flex items-center gap-1.5 text-ink-500">
        {accent === "chem" && <IconFlask aria-hidden className="size-3.5 text-chem-wall" />}
        {accent === "robo" && <IconRobot aria-hidden className="size-3.5 text-robo-wall" />}
        {eyebrow}
      </p>
      <p className={cn("type-heading mt-2", lg ? "line-clamp-3 text-[1.75rem] leading-[1.05]" : "line-clamp-2 text-lg leading-[1.12]", href && "pr-12")}>{title}</p>
      <p className={cn("text-ink-500", lg ? "mt-3 line-clamp-3 text-[16px] leading-relaxed" : "mt-1.5 line-clamp-2 text-[13px] leading-snug")}>{detail}</p>
      <p className={cn("inline-flex items-center gap-2 text-[13px] font-semibold", lg ? "mt-auto pt-4" : "mt-3", LABEL_TONE[tone])}>
        <span aria-hidden className={cn("size-2 rounded-full", DOT[tone])} />
        {statusLabel}
      </p>
      {href && (
        <IconButton href={href} label={`Open: ${title}`} size="sm" tone="dark" className="absolute right-3 top-3">
          <IconArrowUpRight />
        </IconButton>
      )}
    </PaperCard>
  );
}
