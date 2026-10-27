import { cn } from "@/lib/cn";

/*
 * The stage card (DESIGN.md §2 P4): a soft cream rounded card behind Ano that
 * frames the hero object, with a warm light pooling at its base.
 */

export function StageCard({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute rounded-[2.75rem] bg-cream-100/85 shadow-warm-lg", className)}>
      <span className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(70%_55%_at_50%_100%,color-mix(in_oklab,var(--color-apricot-300)_55%,transparent),transparent_70%)]" />
      <span className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/70" />
    </div>
  );
}
