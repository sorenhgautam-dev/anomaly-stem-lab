"use client";

import Link from "next/link";
import { useRef, ViewTransition, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import type { LevelId } from "@/engine/types";
import { cn } from "@/lib/cn";
import { useTilt } from "@/lib/motion";
import { Chip } from "@/components/ui/Chip";

/*
 * A tall level card (DESIGN.md §7.2): the level's gradient fill, a big
 * numeral, and a white panel with the grade badge, title, one line and the
 * experiment count (text stays on white for contrast). Tilts toward the cursor
 * inside its own hit area. `peek` sits above the card (Ano).
 */

const GRADIENT: Record<LevelId, string> = { easy: "bg-level-easy", medium: "bg-level-medium", advanced: "bg-level-advanced" };

export function LevelCard({ level, index, title, grades, line, count, soon, peek }: { level: LevelId; index: number; title: string; grades: string; line: string; count: number; soon: number; peek?: ReactNode }) {
  const host = useRef<HTMLAnchorElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useTilt(host, inner, 5);
  return (
    <div className="relative">
      {peek}
      <Link ref={host} href={`/start/${level}`} prefetch className="group block rounded-frame outline-none [perspective:1200px]">
        {/* The card grows into the lab select page's frame (DESIGN.md §9). */}
        <ViewTransition name={`level-${level}`} share="morph" default="none">
          <div
            ref={inner}
            className={cn("relative flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-frame p-5 shadow-warm transition-[transform,box-shadow] duration-500 ease-out-soft group-hover:shadow-warm-lg md:min-h-[30rem]", GRADIENT[level])}
          >
            <span aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_50%_at_30%_10%,rgb(255_255_255/0.4),transparent_70%)]" />
            <span aria-hidden className="relative flex items-start justify-between">
              <span className="type-hero text-[7rem] text-ink-900/85">0{index + 1}</span>
              <span className="grid size-11 place-items-center rounded-full bg-white/90 text-ink-900 transition-transform duration-300 ease-spring group-hover:-rotate-12 group-hover:scale-110">
                <ArrowUpRight className="size-5" />
              </span>
            </span>
            <span className="glass-card relative flex flex-col gap-2 rounded-card p-5">
              <Chip tone="dark" className="w-fit">
                {grades}
              </Chip>
              <span className="type-heading text-3xl">{title}</span>
              <span className="text-[15px] leading-relaxed text-ink-700">{line}</span>
              <span className="text-sm font-semibold text-ink-900">
                {count} experiments{soon > 0 && <span className="font-medium text-ink-500"> · {soon} coming soon</span>}
              </span>
            </span>
          </div>
        </ViewTransition>
      </Link>
    </div>
  );
}
