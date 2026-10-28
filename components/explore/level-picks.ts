import { comingSoonFor, experimentsFor, LAB_IDS, LEVEL_INFO, misconceptionText } from "@/lib/content";
import type { LabId, LevelId } from "@/engine/types";

/*
 * Each level for the level picker, from the real content: its element tile
 * (symbol, grade range, name, experiment count), the experiments for the
 * shelf, how many of them each lab has, how many distinct beliefs its
 * experiments break and three of them as teasers (the level's chosen one
 * first). Ano's line for when the dial lands on it.
 */

export interface LevelPick {
  id: LevelId;
  title: string;
  symbol: string;
  /** The grade range, "6–8". */
  grades: string;
  line: string;
  ano: string;
  count: number;
  soon: number;
  experiments: { id: string; title: string; lab: LabId }[];
  /** Experiments per lab. */
  labs: Record<LabId, number>;
  beliefs: number;
  /** Up to three of the beliefs, by title, the level's chosen teaser first. */
  teasers: string[];
}

const TEASERS = 3;

export function levelPicks(): LevelPick[] {
  return LEVEL_INFO.map((level) => {
    const experiments = LAB_IDS.flatMap((lab) => experimentsFor(lab, level.id));
    const beliefs = new Set(experiments.flatMap((e) => e.misconceptions));
    return {
      id: level.id,
      title: level.title,
      symbol: level.symbol,
      grades: level.grades.replace(/^Grades\s+/, ""),
      line: level.line,
      ano: level.ano,
      count: experiments.length,
      soon: LAB_IDS.reduce((n, lab) => n + comingSoonFor(lab, level.id).length, 0),
      // Chemistry then robotics on the shelf, in each lab's own order.
      experiments: [...experiments].sort((a, b) => (a.lab === b.lab ? a.order - b.order : a.lab === "chemistry" ? -1 : 1)).map((e) => ({ id: e.id, title: e.title, lab: e.lab })),
      labs: { chemistry: experiments.filter((e) => e.lab === "chemistry").length, robotics: experiments.filter((e) => e.lab === "robotics").length },
      beliefs: beliefs.size,
      teasers: [level.teaser, ...[...beliefs].filter((id) => id !== level.teaser)]
        .map((id) => misconceptionText(id)?.title)
        .filter((t): t is string => !!t)
        .slice(0, TEASERS),
    };
  });
}
