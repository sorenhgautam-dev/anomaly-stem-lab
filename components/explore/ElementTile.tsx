import Link from "next/link";
import type { LevelId } from "@/engine/types";
import { cn } from "@/lib/cn";
import { ScrollCount } from "@/components/ui/ScrollCount";
import type { LevelPick } from "./level-picks";

/*
 * A level as a periodic-table tile: a solid block in the level's earthy
 * colour (Easy sage, Medium sand gold, Advanced teal) with the grade
 * range where the atomic number goes, the experiment count where the mass
 * goes, a big element symbol (Ea, Md, Ad) and the level's name. Keyed by
 * level, so each change flips a new tile in (animate-tile-flip).
 * MiniTile is the small one that goes straight to a level.
 */

/** Each level's earthy colour (sage, sand gold, teal) and the text colour that reads on it. */
export const TILE_FILL: Record<LevelId, string> = { easy: "bg-chem-sage text-ink-900", medium: "bg-chem-gold text-ink-900", advanced: "bg-chem-wall text-white" };

export function ElementTile({ level, className }: { level: LevelPick; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex aspect-[5/6] w-full flex-col justify-between overflow-hidden rounded-card p-5 text-ink-900 shadow-warm sm:p-7",
        "bg-[image:var(--paper-grain)] animate-tile-flip motion-reduce:animate-none",
        TILE_FILL[level.id],
        className,
      )}
    >
      {/* The printed edge of the tile. */}
      <span aria-hidden className="pointer-events-none absolute inset-2.5 rounded-panel border-[1.5px] border-current opacity-20" />
      <div className="relative flex items-start justify-between">
        <p className="flex flex-col">
          <span className="type-readout text-[clamp(1.4rem,3vw,2rem)] leading-none">{level.grades}</span>
          <span className="mt-1 text-[13px] font-semibold opacity-75">grades</span>
        </p>
        <p className="flex flex-col items-end">
          <ScrollCount value={level.count} className="type-readout text-[clamp(1.4rem,3vw,2rem)] leading-none" />
          <span className="mt-1 text-[13px] font-semibold opacity-75">{level.count === 1 ? "experiment" : "experiments"}</span>
        </p>
      </div>
      <p aria-hidden className="type-hero tilt-layer relative -my-2 text-[clamp(7rem,17vw,12rem)] leading-[0.8] normal-case [--depth:0.06]">
        {level.symbol}
      </p>
      <div className="relative">
        <h3 className="type-heading text-[clamp(1.9rem,3.4vw,2.6rem)]">{level.title}</h3>
        {/* The count is already printed top right; this line says what's still to come. */}
        <p className="mt-1 text-[15px] font-medium opacity-85">{level.soon > 0 ? `${level.soon} more on the way` : "Every experiment ready"}</p>
      </div>
    </div>
  );
}

/** A small tile that goes straight to a level's labs: its symbol and grades, named by its visible text and the level. */
export function MiniTile({ level, active }: { level: LevelPick; active: boolean }) {
  return (
    <Link
      href={`/start/${level.id}`}
      aria-current={active ? "true" : undefined}
      className={cn(
        "group relative flex h-16 w-[4.75rem] flex-col justify-between rounded-tile p-2 text-left text-ink-900 shadow-warm-sm transition-transform duration-200 ease-spring hover:-translate-y-0.5 active:translate-y-0.5",
        "bg-[image:var(--paper-grain)]",
        TILE_FILL[level.id],
        active ? "ring-2 ring-ink-900 ring-offset-2 ring-offset-cream-100" : "ring-1 ring-ink-900/10",
      )}
    >
      <span className="type-readout text-[10px] leading-none">{level.grades}</span>
      <span className="type-heading text-[1.35rem] leading-none">{level.symbol}</span>
      {/* The name in full: "Ea" alone doesn't say Easy. */}
      <span className="text-[11px] font-semibold leading-none">{level.title}</span>
    </Link>
  );
}
