"use client";

import Link from "next/link";
import { ViewTransition } from "react";
import { IconCheck } from "@/components/icons/icons";
import type { LabId } from "@/engine/types";
import { cn } from "@/lib/cn";
import { Tilt } from "@/components/ui/Tilt";
import { resumeAudio, whoosh } from "@/lib/sound";
import { ApparatusWindow } from "./ApparatusWindow";

/*
 * One node on the experiment map (DESIGN.md §7.4): a paper card with a small
 * window onto the experiment's own apparatus (ApparatusWindow), its number
 * and title, and a status line like an instrument's: a status light, then
 * the status and time in mono. Done = verify, current = a breathing light
 * and a ring in the lab's gold, locked = cream with the apparatus behind frosted paper (not a link
 * until the one before it is done).
 */

export type NodeStatus = "done" | "current" | "open" | "locked" | "soon";

const STATUS: Record<NodeStatus, { light: string; label: string }> = {
  done: { light: "bg-verify-500", label: "Done" },
  current: { light: "", label: "Up next" },
  open: { light: "bg-ink-900", label: "Open" },
  locked: { light: "bg-ink-300", label: "Locked" },
  soon: { light: "bg-ink-300", label: "Coming soon" },
};

export function PathNode({ index, id, lab, title, minutes, status, href, morph }: { index: number; id: string | null; lab: LabId; title: string; minutes: number | null; status: NodeStatus; href: string | null; morph?: string }) {
  const st = STATUS[status];
  const playable = href && (status === "done" || status === "current" || status === "open");
  const body = (
    <>
      <ApparatusWindow id={id} lab={lab} index={index} locked={status === "locked" || status === "soon"} />
      <span className="min-w-0 flex-1">
        <span className="type-readout block text-[12px] text-ink-500">{String(index + 1).padStart(2, "0")}</span>
        <span className="type-heading block text-lg leading-tight">{title}</span>
        <span className="type-readout mt-1.5 flex items-center gap-2 text-[12px] text-ink-700">
          <span aria-hidden className="relative grid size-2.5 place-items-center">
            {status === "current" && <span className={cn("absolute inset-[-3px] animate-breathe rounded-full motion-reduce:hidden", lab === "chemistry" ? "bg-chem-gold/60" : "bg-robo-gold/50")} />}
            <span className={cn("relative size-2.5 rounded-full", status === "current" ? (lab === "chemistry" ? "bg-chem-gold" : "bg-robo-gold") : st.light)} />
          </span>
          {status === "done" && <IconCheck aria-hidden className="size-3.5 text-verify-700" />}
          {st.label}
          {minutes !== null && <span className="text-ink-500">· {minutes} min</span>}
        </span>
      </span>
    </>
  );
  const classes = cn(
    "paper-card relative flex items-center gap-4 rounded-card p-3 pr-4",
    // Locked nodes are a solid cream panel with muted text (not transparent, so the path never shows through).
    playable ? "transition-shadow duration-300 ease-out-soft group-hover:shadow-warm-lg" : "bg-cream-100 text-ink-700 shadow-warm-sm",
    // The lab's gold marks the next experiment (orange stays Ano's).
    status === "current" && (lab === "chemistry" ? "ring-[3px] ring-chem-gold" : "ring-[3px] ring-robo-gold"),
  );
  return (
    <div className="relative">
      {playable ? (
        // It grows into the experiment's mission card (DESIGN.md §9).
        <ViewTransition name={morph} share="morph" default="none">
          <Link
            href={href}
            prefetch
            onClick={() => {
              resumeAudio();
              whoosh();
            }}
            className="group block rounded-card outline-none"
          >
            {/* The link stays still (the hit area); the card tilts inside it. */}
            <Tilt lift={1} degrees={4} innerClassName={classes}>
              {body}
            </Tilt>
          </Link>
        </ViewTransition>
      ) : (
        <div className={classes} aria-label={`${title}, ${st.label}`} role="group">
          {body}
        </div>
      )}
    </div>
  );
}
