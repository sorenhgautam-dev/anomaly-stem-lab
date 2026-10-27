"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { AnoParts } from "./AnoParts";
import { useLoadProgress } from "./useLoadProgress";

/*
 * The first-load screen (DESIGN.md §7.8, CLAUDE.md §3.1 item 10): Ano
 * assembles part by part while the percentage counts the real loading work
 * (fonts, GPU tier, the 3D canvas), then the screen lifts away like a
 * curtain. Rendered on the server so it's there on the very first paint;
 * it never blocks clicks. Its own view-transition name keeps it on top, and
 * still, if a transition runs while it's showing (app/globals.css).
 */

export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "leaving" | "gone">("loading");
  const leave = useCallback(() => setState("leaving"), []);
  useLoadProgress(root, "boot", leave);
  useEffect(() => {
    if (state !== "leaving") return;
    const id = window.setTimeout(() => setState("gone"), 760);
    return () => window.clearTimeout(id);
  }, [state]);
  if (state === "gone") return null;
  return (
    <div ref={root} role="progressbar" aria-label="Loading ANOMALY" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} className={cn("pointer-events-none fixed inset-0 z-95 flex [view-transition-name:preloader] flex-col items-center justify-center gap-5 bg-sunrise", state === "leaving" && "animate-preloader-out motion-reduce:animate-overlay-out")}>
      <AnoParts />
      <p data-percent className="type-hero text-[clamp(3.5rem,11vw,6.5rem)] tabular-nums text-ink-900">
        0%
      </p>
      <p className="text-[15px] font-medium text-ink-500">Assembling Ano…</p>
    </div>
  );
}
