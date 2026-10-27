import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import landing from "@/content/landing.json";
import { cn } from "@/lib/cn";
import { EXPERIMENTS, LEVEL_INFO } from "@/lib/content";
import { SectionHeading } from "./SectionHeading";

/*
 * The levels strip (DESIGN.md §7.1): Easy, Medium, Advanced with their level
 * gradients. Text sits on white, never on the mid-tone gradient (DESIGN.md
 * §3), so the gradient is the card's lit top.
 */

const GRADIENT = { easy: "bg-level-easy", medium: "bg-level-medium", advanced: "bg-level-advanced" } as const;

export function LevelsStrip() {
  return (
    <section aria-labelledby="levels" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-8 sm:py-32">
      <SectionHeading id="levels" title={landing.levels.title} />
      <ul className="mt-12 grid gap-5 md:grid-cols-3">
        {LEVEL_INFO.map((level, i) => {
          const count = EXPERIMENTS.filter((e) => e.level === level.id).length;
          return (
            <li key={level.id} className="reveal" style={{ ["--reveal-end" as string]: `${70 + i * 12}%` }}>
              <Link href={`/start/${level.id}`} className="group flex h-full flex-col overflow-hidden rounded-frame bg-white shadow-warm transition-shadow duration-500 ease-out-soft hover:shadow-warm-lg">
                <span aria-hidden className={cn("relative flex h-36 items-end justify-between p-5", GRADIENT[level.id])}>
                  <span className="type-hero text-7xl text-ink-900/85">0{i + 1}</span>
                  <span className="grid size-11 place-items-center rounded-full bg-white/90 text-ink-900 transition-transform duration-300 ease-spring group-hover:-rotate-12 group-hover:scale-110">
                    <ArrowUpRight className="size-5" />
                  </span>
                </span>
                <span className="flex flex-1 flex-col gap-2 p-6">
                  <span className="type-eyebrow text-ink-500">{level.grades}</span>
                  <span className="type-heading text-3xl">{level.title}</span>
                  <span className="text-[15px] leading-relaxed text-ink-700">{level.line}</span>
                  <span className="mt-auto pt-3 text-sm font-semibold text-ink-900">{count} experiments</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
