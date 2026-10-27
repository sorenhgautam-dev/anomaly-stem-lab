"use client";

import { experimentsFor, levelInfo } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import { useLab } from "@/lib/store";

/*
 * The level's progress ribbon (DESIGN.md §7.5 success moment: "progress
 * ribbon fills"): the Ribbon gradient grows to the share of the level done.
 */

export function LevelProgress() {
  const def = useLab((s) => s.def);
  const done = useProgress((s) => s.done);
  if (!def) return null;
  const all = experimentsFor(def.lab, def.level);
  const count = all.filter((e) => done[e.id]).length;
  const share = all.length ? count / all.length : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] font-semibold text-ink-700">
        {levelInfo(def.level).title} level: {count} of {all.length} done
      </p>
      <div className="h-2.5 overflow-hidden rounded-full bg-cream-200" role="progressbar" aria-valuemin={0} aria-valuemax={all.length} aria-valuenow={count} aria-label="Level progress">
        <div className="h-full origin-left rounded-full bg-ribbon transition-transform duration-1000 ease-out-soft" style={{ transform: `scaleX(${share})` }} />
      </div>
    </div>
  );
}
