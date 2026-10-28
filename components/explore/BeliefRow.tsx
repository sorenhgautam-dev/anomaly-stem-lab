import Link from "next/link";
import type { LabId } from "@/engine/types";
import { IconFlask, IconMolecule, IconRobot, IconScan, IconShield, IconTarget } from "@/components/icons/icons";
import type { BeliefItem, BeliefStatus } from "@/lib/beliefs";
import { cn } from "@/lib/cn";
import { curly } from "@/lib/typography";
import { levelInfo } from "@/lib/content";
import { TILE_FILL } from "./ElementTile";

/*
 * One line in the belief register (My beliefs): a ruled row on a lab
 * notebook page. The level's element tile (Ea, Md, Ad), the lab's mark in
 * its own colour, the belief in the student's words, and a rubber stamp for
 * its status. The whole row opens the experiment that tests it.
 */

const STAMP: Record<BeliefStatus, { text: string; className: string }> = {
  broken: { text: "Busted", className: "border-verify-700 text-verify-700 -rotate-6" },
  challenged: { text: "Testing", className: "border-chem-wall text-chem-wall -rotate-3" },
  untested: { text: "Not tested", className: "border-dashed border-ink-300 text-ink-500 rotate-2" },
};

/** Each lab's small mark beside a belief: its icon, name and colour. */
const MARK: Record<LabId, { icon: typeof IconMolecule; label: string; tone: string }> = {
  cell: { icon: IconMolecule, label: "Cell Lab", tone: "text-chem-wall" },
  prevention: { icon: IconShield, label: "Prevention Lab", tone: "text-ink-700" },
  detection: { icon: IconScan, label: "Detection Lab", tone: "text-robo-teal" },
  treatment: { icon: IconTarget, label: "Treatment Lab", tone: "text-robo-wall" },
  chemistry: { icon: IconFlask, label: "Chemistry", tone: "text-chem-wall" },
  robotics: { icon: IconRobot, label: "Robotics", tone: "text-robo-wall" },
};

export function BeliefRow({ item, status, index }: { item: BeliefItem; status: BeliefStatus; index: number }) {
  const level = levelInfo(item.level);
  const stamp = STAMP[status];
  const mark = MARK[item.lab];
  const Mark = mark.icon;
  return (
    <Link
      href={item.href}
      className="group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-4 py-4 outline-none transition-colors duration-200 hover:bg-cream-100 focus-visible:bg-cream-100 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6"
    >
      <span className="flex items-center gap-2.5">
        <span className="type-readout w-7 text-right text-[12px] text-ink-300">{String(index + 1).padStart(2, "0")}</span>
        <span aria-label={`${level.title} level`} className={cn("flex size-10 flex-col justify-between rounded-[0.4rem] bg-[image:var(--paper-grain)] p-1 text-ink-900", TILE_FILL[item.level])}>
          <span className="type-readout text-[8px] leading-none">{level.grades.replace(/^Grades\s+/, "")}</span>
          <span className="type-heading text-[1.05rem] leading-none">{level.symbol}</span>
        </span>
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <Mark aria-label={mark.label} className={cn("size-4 shrink-0", mark.tone)} />
          {/* Wraps rather than truncating: on phones a belief's title is the point of the row. */}
          <span className="type-heading text-[1.15rem] leading-tight">{curly(item.title)}</span>
        </span>
        <span className="mt-1 line-clamp-2 block text-[14px] leading-snug text-ink-500">{curly(item.belief)}</span>
      </span>
      <span className="col-start-2 flex items-center gap-4 sm:col-start-3">
        <span className={cn("type-readout rounded-[0.3rem] border-2 px-2 py-0.5 text-[11px] font-semibold", stamp.className)}>{stamp.text}</span>
        <span className="text-[14px] font-semibold text-ink-900 underline decoration-ink-900/20 decoration-2 underline-offset-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 max-sm:opacity-100">Test it</span>
      </span>
    </Link>
  );
}
