"use client";

import Link from "next/link";
import { experimentsFor } from "@/lib/content";
import { cn } from "@/lib/cn";
import { useProgress } from "@/lib/progress";
import { useLab } from "@/lib/store";

/*
 * A mini map of the level in the window's corner (CLAUDE.md §3.6.3): one
 * star per experiment and a progress bar. A correct run turns this
 * experiment's star gold and fills the bar (the §3.7 success moment).
 * Clicking it goes back to the full map.
 */
export function LevelMiniMap({ className }: { className?: string }) {
  const def = useLab((s) => s.def);
  const hydrated = useProgress((s) => s.hydrated);
  const done = useProgress((s) => s.done);
  if (!def) return null;
  const siblings = experimentsFor(def.lab, def.level);
  const doneCount = hydrated ? siblings.filter((e) => done[e.id]).length : 0;

  return (
    <Link
      href={`/labs/${def.lab}/${def.level}`}
      aria-label={`Back to the map: ${doneCount} of ${siblings.length} done`}
      className={cn(
        "group flex min-h-11 flex-col items-end justify-center gap-2 rounded-2xl px-3.5 py-2.5 transition-colors duration-300 ease-lab hover:bg-ion-400/10",
        className,
      )}
    >
      <span className="flex items-center gap-2">
        {siblings.map((e) => {
          const isDone = hydrated && done[e.id];
          const here = e.id === def.id;
          return (
            <span
              key={e.id}
              className={cn(
                "size-2 rounded-full transition-[background-color,box-shadow,transform] duration-700 ease-lab",
                isDone ? "bg-resolve-400 shadow-[0_0_10px_2px_var(--color-resolve-400)]" : here ? "bg-glow-400 shadow-[0_0_10px_1px_var(--color-glow-400)]" : "bg-mist-600/60",
                here && "scale-125",
                here && !isDone && "animate-pulse",
              )}
            />
          );
        })}
      </span>
      <span className="h-0.5 w-full overflow-hidden rounded-full bg-mist-600/30">
        <span
          className="block h-full origin-left bg-linear-to-r from-ion-500 to-glow-400 transition-transform duration-1000 ease-lab"
          style={{ transform: `scaleX(${siblings.length ? doneCount / siblings.length : 0})` }}
        />
      </span>
    </Link>
  );
}
