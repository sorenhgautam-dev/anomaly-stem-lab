import { cn } from "@/lib/cn";

/*
 * The stage card (DESIGN.md §2 P4): the solid rounded card behind Ano that
 * frames the hero object. With `tone`, it takes a lab's palette (the landing
 * hero's slides: Robotics graphite, Chemistry teal, the drop's beige) and
 * cross-fades between them as the tone changes; without, it's cream warming
 * toward apricot at its base (one hue).
 */

export type StageTone = "treatment" | "detection" | "cell";

const TONES: { tone: StageTone; className: string }[] = [
  { tone: "treatment", className: "bg-stage-treatment" },
  { tone: "detection", className: "bg-stage-detection" },
  { tone: "cell", className: "bg-stage-cell" },
];

export function StageCard({ tone, className }: { tone?: StageTone; className?: string }) {
  return (
    <div aria-hidden data-hero-stage data-stage-card className={cn("pointer-events-none absolute overflow-hidden rounded-[2.75rem] bg-cream-50 shadow-warm-lg", className)}>
      {tone ? (
        TONES.map((t) => <span key={t.tone} className={cn("absolute inset-0 transition-opacity duration-700 ease-out-soft", t.className, t.tone === tone ? "opacity-100" : "opacity-0")} />)
      ) : (
        <span className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(to_top,var(--color-apricot-200),transparent_55%)]" />
      )}
      <span className="absolute inset-0 rounded-[inherit] ring-[1.5px] ring-inset ring-ink-900/[0.06]" />
    </div>
  );
}
