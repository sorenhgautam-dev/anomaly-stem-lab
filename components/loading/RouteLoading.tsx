"use client";

import { useRef } from "react";
import { AnoParts } from "./AnoParts";
import { useLoadProgress } from "./useLoadProgress";

/* A page still streaming in (DESIGN.md §7.8): the same Ano assembly, counting toward 90 %. */
export function RouteLoading() {
  const root = useRef<HTMLDivElement>(null);
  useLoadProgress(root, "route");
  return (
    <div ref={root} role="progressbar" aria-label="Loading the page" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-5 bg-paper">
      <AnoParts />
      <p data-percent className="type-hero text-[clamp(3rem,9vw,5rem)] tabular-nums text-ink-900">
        0%
      </p>
      <p className="text-[15px] font-medium text-ink-500">Assembling Ano…</p>
    </div>
  );
}
