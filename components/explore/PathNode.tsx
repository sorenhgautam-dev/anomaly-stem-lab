import Link from "next/link";
import { ViewTransition } from "react";
import type { ReactNode } from "react";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { Chip } from "@/components/ui/Chip";

/*
 * One node on the experiment map (DESIGN.md §7.4): a small glass card with the
 * title, time and status. Done = verify, current = pulsing apricot, locked =
 * cream (not a link until the one before it is done).
 */

export type NodeStatus = "done" | "current" | "open" | "locked" | "soon";

const CHIP: Record<NodeStatus, { tone: "verified" | "high" | "low" | "neutral"; label: string }> = {
  done: { tone: "verified", label: "Done" },
  current: { tone: "high", label: "Up next" },
  open: { tone: "neutral", label: "Open" },
  locked: { tone: "low", label: "Locked" },
  soon: { tone: "low", label: "Coming soon" },
};

export function PathNode({ index, title, minutes, status, href, morph, peek }: { index: number; title: string; minutes: number | null; status: NodeStatus; href: string | null; morph?: string; peek?: ReactNode }) {
  const chip = CHIP[status];
  const playable = href && (status === "done" || status === "current" || status === "open");
  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "relative grid size-12 shrink-0 place-items-center rounded-full font-mono text-sm font-semibold",
          status === "done" ? "bg-verify-500 text-white" : status === "current" ? "bg-ink-900 text-white" : status === "open" ? "bg-white text-ink-900 ring-1 ring-ink-900/10" : "bg-cream-200 text-ink-500",
        )}
      >
        {status === "current" && <span className="absolute inset-0 animate-breathe rounded-full bg-apricot-400 motion-reduce:hidden" />}
        <span className="relative">{status === "done" ? <Check className="size-5" strokeWidth={3} /> : status === "locked" || status === "soon" ? <Lock className="size-4" /> : String(index + 1).padStart(2, "0")}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="type-heading block text-lg leading-tight">{title}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-2">
          <Chip tone={chip.tone}>
            {status === "done" && <Check aria-hidden className="size-3" strokeWidth={3} />}
            {chip.label}
          </Chip>
          {minutes !== null && <span className="text-[13px] text-ink-500">{minutes} min</span>}
        </span>
      </span>
    </>
  );
  const classes = cn(
    "glass-card relative flex items-center gap-4 rounded-card p-4",
    // Locked nodes are a solid cream panel with muted text (not transparent, so the path never shows through).
    playable ? "transition-shadow duration-300 ease-out-soft hover:shadow-warm-lg" : "bg-cream-100 text-ink-700 shadow-warm-sm",
    status === "current" && "ring-2 ring-apricot-400",
  );
  return (
    <div className="relative">
      {peek}
      {playable ? (
        // It grows into the experiment's mission card (DESIGN.md §9).
        <ViewTransition name={morph} share="morph" default="none">
          <Link href={href} prefetch className={classes}>
            {body}
          </Link>
        </ViewTransition>
      ) : (
        <div className={classes} aria-label={`${title}, ${chip.label}`} role="group">
          {body}
        </div>
      )}
    </div>
  );
}
