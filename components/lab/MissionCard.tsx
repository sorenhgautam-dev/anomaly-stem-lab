"use client";

import { ViewTransition } from "react";
import { IconShield } from "@/components/icons/icons";
import type { ExperimentDef } from "@/engine/types";
import { labInfo, levelInfo } from "@/lib/content";
import { cn } from "@/lib/cn";
import { LearningNote } from "@/components/ui/LearningNote";
import { PaperCard } from "@/components/ui/PaperCard";

/*
 * The mission card (DESIGN.md §7.5 top, CLAUDE.md §3.5 top bar): the
 * experiment, its goal in one sentence, the real-lab safety note and the
 * learning note; once the run starts, only the title and the learning note
 * (how sure the student is sits under the choices, in PredictDock). The map node the student clicked
 * grows into it (DESIGN.md §9), so it takes the experiment from props, which
 * is right on the navigation's very first render.
 */

export function MissionCard({ def, className, compact = false }: { def: ExperimentDef; className?: string; compact?: boolean }) {
  return (
    <ViewTransition name={`exp-${def.id}`} share="morph" default="none">
      <PaperCard data-lab-mission className={cn("flex flex-col gap-3 p-4 sm:p-5", className)}>
        <p className="type-label text-ink-500">
          Mission · {labInfo(def.lab).title.replace(" Lab", "")} · {levelInfo(def.level).title} · {def.minutes} min
        </p>
        <div>
          <h1 className="type-heading text-2xl leading-tight sm:text-[1.7rem]">{def.title}</h1>
          {!compact && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{def.goal}</p>}
        </div>
        {def.safety && (
          <p className="flex gap-2 rounded-tile bg-apricot-100/70 p-2.5 text-[13px] leading-snug text-ink-700">
            <IconShield aria-hidden className="mt-0.5 size-4 shrink-0 text-apricot-700" />
            {def.safety}
          </p>
        )}
        <LearningNote />
      </PaperCard>
    </ViewTransition>
  );
}
