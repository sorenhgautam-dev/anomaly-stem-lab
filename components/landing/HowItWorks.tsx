import { Blocks, ScanSearch, Target, Zap, type LucideIcon } from "lucide-react";
import landing from "@/content/landing.json";
import { cn } from "@/lib/cn";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeading } from "./SectionHeading";

/*
 * How it works (DESIGN.md §7.1): Predict, Diagnose, Break, Rebuild as glass
 * cards with gradient icon tiles, each icon on its own tiny loop.
 */

const STEPS: Record<string, { icon: LucideIcon; tile: string; loop: string }> = {
  predict: { icon: Target, tile: "bg-chem", loop: "animate-bob" },
  diagnose: { icon: ScanSearch, tile: "bg-robo", loop: "animate-scan" },
  break: { icon: Zap, tile: "bg-glitch", loop: "animate-wiggle" },
  rebuild: { icon: Blocks, tile: "bg-level-easy", loop: "animate-bob [animation-delay:-1.2s]" },
};

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-24 sm:px-8 sm:py-32">
      <SectionHeading id="how-it-works" title={landing.how.title} />
      <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {landing.how.steps.map((step, i) => {
          const s = STEPS[step.id];
          const Icon = s.icon;
          return (
            <li key={step.id} className="reveal" style={{ ["--reveal-end" as string]: `${70 + i * 10}%` }}>
              <GlassCard className="flex h-full flex-col gap-4 p-6">
                <span className="flex items-center justify-between">
                  <span aria-hidden className={cn("relative grid size-14 place-items-center rounded-tile text-white shadow-warm-sm", s.tile)}>
                    {i === 0 && <span className="absolute inset-0 animate-ping-soft rounded-tile border-2 border-apricot-400 motion-reduce:hidden" />}
                    <Icon className={cn("size-6 motion-reduce:animate-none", s.loop)} strokeWidth={2} />
                  </span>
                  <span className="type-readout text-sm text-ink-300">0{i + 1}</span>
                </span>
                <h3 className="type-heading text-2xl">{step.title}</h3>
                <p className="text-[15px] leading-relaxed text-ink-700">{step.body}</p>
              </GlassCard>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
