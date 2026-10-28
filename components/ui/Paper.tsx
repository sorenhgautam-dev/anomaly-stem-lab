import { cn } from "@/lib/cn";

/*
 * The paper background (DESIGN.md §3 "Paper"): flat warm cream with a fine
 * grain and a very soft top-to-bottom shift. Lab pages tint it toward their
 * world (Chemistry beige, Robotics bench white); whole pages can take the
 * sage or night mood, or Chemistry's teal (its maps). It stays still (§9): colour comes from
 * the objects and colour blocks on top, never from glowing blobs.
 */

const TINT = { paper: "bg-paper", chem: "bg-paper-chem", robo: "bg-paper-robo", sage: "bg-paper-sage", night: "bg-paper-night", teal: "bg-paper-teal", gold: "bg-paper-gold" } as const;

export type PaperTint = keyof typeof TINT;

export function Paper({ className, tint = "paper" }: { className?: string; tint?: PaperTint }) {
  return <div aria-hidden className={cn("pointer-events-none absolute inset-0", TINT[tint], className)} />;
}
