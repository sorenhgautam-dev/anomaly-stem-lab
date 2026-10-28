import { ViewTransition, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Ribbon } from "./Ribbon";
import { Paper, type PaperTint } from "./Paper";

/*
 * The rounded frame (DESIGN.md §2 P1): a large panel, radius 32 px, inset
 * 12 px from the viewport on desktop and full-bleed on mobile, on paper
 * and edged with the ribbon (P7). A hairline and a warm shadow keep its
 * edge visible against the page. It sets no z-index or transform, so
 * the 3D canvas can sit between its background and its floating cards.
 * `morph` names it for a page transition: the card with the same name on
 * the previous page grows into it (DESIGN.md §9).
 */

/** The ribbon follows the paper's mood: sage to teal on sage paper, gold on night (one hue family each). */
const RIBBON: Partial<Record<PaperTint, string>> = {
  sage: "[--ribbon-1:var(--color-chem-sage)] [--ribbon-2:color-mix(in_oklab,var(--color-chem-sage)_50%,var(--color-chem-wall))] [--ribbon-3:var(--color-chem-wall)]",
  night: "[--ribbon-1:color-mix(in_oklab,var(--color-robo-gold)_45%,var(--color-robo-stage))] [--ribbon-2:color-mix(in_oklab,var(--color-robo-gold)_75%,var(--color-robo-stage))] [--ribbon-3:var(--color-robo-gold)]",
  teal: "[--ribbon-1:color-mix(in_oklab,var(--color-chem-gold)_40%,var(--color-chem-floor))] [--ribbon-2:color-mix(in_oklab,var(--color-chem-gold)_70%,var(--color-chem-floor))] [--ribbon-3:var(--color-chem-gold)]",
};

export function Frame({ children, ribbon = true, tint, morph, className }: { children: ReactNode; ribbon?: boolean; tint?: PaperTint; morph?: string; className?: string }) {
  const frame = (
    <div className={cn("relative flex min-h-dvh flex-col overflow-hidden md:m-3 md:min-h-[calc(100dvh-1.5rem)] md:rounded-frame md:shadow-warm md:ring-1 md:ring-ink-900/[0.05]", tint && RIBBON[tint], className)}>
      <Paper tint={tint} />
      {ribbon && <Ribbon />}
      {children}
    </div>
  );
  return morph ? (
    <ViewTransition name={morph} share="morph" default="none">
      {frame}
    </ViewTransition>
  ) : (
    frame
  );
}
