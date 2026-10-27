import type { LabId, LevelId } from "@/engine/types";
import { allMisconceptions, EXPERIMENTS, labInfo, levelInfo } from "@/lib/content";
import type { BeliefTone } from "@/components/ui/BeliefShiftCard";

/*
 * Beliefs as students see them (DESIGN.md §7.1 belief wall, §7.6 My
 * beliefs): each misconception with the first experiment built to test it,
 * and its status from this browser's progress.
 */

export interface BeliefItem {
  id: string;
  title: string;
  belief: string;
  lab: LabId;
  level: LevelId;
  /** "Chemistry · Easy" */
  where: string;
  href: string;
}

export function beliefItems(): BeliefItem[] {
  const items: BeliefItem[] = [];
  for (const m of allMisconceptions()) {
    const test = EXPERIMENTS.filter((e) => e.misconceptions.includes(m.id)).sort((a, b) => a.order - b.order)[0];
    if (!test) continue;
    items.push({
      id: m.id,
      title: m.title,
      belief: m.belief,
      lab: test.lab,
      level: test.level,
      where: `${labInfo(test.lab).title.replace(" Lab", "")} · ${levelInfo(test.level).title}`,
      href: `/labs/${test.lab}/${test.level}/${test.id}`,
    });
  }
  return items;
}

export type BeliefStatus = "broken" | "challenged" | "untested";

export function beliefStatus(id: string, broken: Record<string, true>, evidence: Record<string, number>): { status: BeliefStatus; tone: BeliefTone; label: string } {
  if (broken[id]) return { status: "broken", tone: "broken", label: "Belief broken" };
  if ((evidence[id] ?? 0) > 0) return { status: "challenged", tone: "challenged", label: "Challenged" };
  return { status: "untested", tone: "untested", label: "Not yet tested" };
}
