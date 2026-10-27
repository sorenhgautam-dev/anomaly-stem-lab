import { ViewTransition, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Ribbon } from "./Ribbon";
import { Sunrise, type SunriseTint } from "./Sunrise";

/*
 * The rounded frame (DESIGN.md §2 P1): a large panel, radius 32 px, inset
 * 12 px from the viewport on desktop and full-bleed on mobile, lit by the
 * Sunrise and edged with the ribbon (P7). It sets no z-index or transform, so
 * the 3D canvas can sit between its background and its floating cards.
 * `morph` names it for a page transition: the card with the same name on
 * the previous page grows into it (DESIGN.md §9).
 */

export function Frame({ children, ribbon = true, tint, morph, className }: { children: ReactNode; ribbon?: boolean; tint?: SunriseTint; morph?: string; className?: string }) {
  const frame = (
    <div className={cn("relative flex min-h-dvh flex-col overflow-hidden md:m-3 md:min-h-[calc(100dvh-1.5rem)] md:rounded-frame", className)}>
      <Sunrise tint={tint} />
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
