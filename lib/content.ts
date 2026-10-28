import { experimentSchema, hintSchema, misconceptionSchema, theorySchema } from "@/engine/schema";
import type {
  ExperimentDef,
  HintDef,
  LabId,
  LevelId,
  MisconceptionDef,
  TheoryDef,
} from "@/engine/types";
import comingSoon from "@/content/coming-soon.json";
import labs from "@/content/labs.json";
import levels from "@/content/levels.json";
import { assertCited } from "./citations";
import * as manifest from "./content-manifest";
import { HIDDEN_LABS, isVisibleLab, VISIBLE_LABS } from "./labs";

/*
 * All content, validated with zod when this module loads, so a broken JSON
 * file fails loudly in dev and in the build instead of in a student's run.
 * The import list is generated (scripts/content-manifest.mjs).
 */

function parseAll<T>(items: unknown[], schema: { parse: (v: unknown) => T }, kind: string): T[] {
  return items.map((item, i) => {
    try {
      return schema.parse(item);
    } catch (error) {
      const id = (item as { id?: string; misconceptionId?: string }).id ?? (item as { misconceptionId?: string }).misconceptionId;
      throw new Error(`Invalid ${kind} #${i}${id ? ` (${id})` : ""}: ${(error as Error).message}`);
    }
  });
}

/** Every experiment, the hidden chemistry and robotics ones included (their routes still work). */
export const ALL_EXPERIMENTS: ExperimentDef[] = parseAll(manifest.experiments, experimentSchema, "experiment");
/** The experiments the site shows: the cancer labs only. Lists, counts, maps and previews use these. */
export const EXPERIMENTS: ExperimentDef[] = ALL_EXPERIMENTS.filter((e) => isVisibleLab(e.lab));
const MISCONCEPTIONS = new Map(
  parseAll(manifest.misconceptions, misconceptionSchema, "misconception").map((m) => [m.id, m]),
);
const HINTS = new Map(parseAll(manifest.hints, hintSchema, "hint").map((h) => [h.misconceptionId, h]));
const THEORY = new Map(parseAll(manifest.theory, theorySchema, "theory").map((t) => [t.id, t]));

// No claim ships without its source (CLAUDE.md §4): an unknown citation id fails the build here.
for (const e of ALL_EXPERIMENTS) assertCited(`experiment ${e.id}`, e.citationIds);
for (const m of MISCONCEPTIONS.values()) assertCited(`misconception ${m.id}`, m.citationIds);
for (const t of THEORY.values()) assertCited(`theory ${t.id}`, t.citationIds);

/** The labs the site shows, in story order. */
export const LAB_IDS: LabId[] = [...VISIBLE_LABS];
/** Every lab with a route, hidden ones included. */
const ROUTED_LABS: LabId[] = [...VISIBLE_LABS, ...HIDDEN_LABS];
export const LEVEL_IDS: LevelId[] = ["easy", "medium", "advanced"];

export interface LevelInfo {
  id: LevelId;
  title: string;
  grades: string;
  line: string;
  /** The level's element symbol on its periodic-table tile (Ea, Md, Ad). */
  symbol: string;
  /** The misconception id teased on the level select page. */
  teaser: string;
  /** What Ano says when the dial lands on this level. */
  ano: string;
}
export interface LabInfo {
  id: LabId;
  title: string;
  line: string;
}
export interface ComingSoon {
  lab: LabId;
  level: LevelId;
  title: string;
}

export const LEVEL_INFO = levels as LevelInfo[];
export const LAB_INFO = labs as LabInfo[];
/** The lab cards the site shows (cancer labs, story order). */
export const VISIBLE_LAB_INFO = LAB_IDS.map((id) => LAB_INFO.find((l) => l.id === id)!);
const COMING_SOON = comingSoon as ComingSoon[];

export function isLab(value: string): value is LabId {
  return (ROUTED_LABS as string[]).includes(value);
}

export function isLevel(value: string): value is LevelId {
  return (LEVEL_IDS as string[]).includes(value);
}

export function levelInfo(level: LevelId): LevelInfo {
  return LEVEL_INFO.find((l) => l.id === level)!;
}

export function labInfo(lab: LabId): LabInfo {
  return LAB_INFO.find((l) => l.id === lab)!;
}

export function getExperiment(id: string): ExperimentDef | undefined {
  return ALL_EXPERIMENTS.find((e) => e.id === id);
}

/** The playable experiments of a lab and level, in the order they open. */
export function experimentsFor(lab: LabId, level: LevelId): ExperimentDef[] {
  return ALL_EXPERIMENTS.filter((e) => e.lab === lab && e.level === level).sort((a, b) => a.order - b.order);
}

/** Planned experiments shown as locked "coming soon" stars. */
export function comingSoonFor(lab: LabId, level: LevelId): ComingSoon[] {
  return COMING_SOON.filter((c) => c.lab === lab && c.level === level);
}

export function allMisconceptions(): MisconceptionDef[] {
  return [...MISCONCEPTIONS.values()];
}

export function misconceptionText(id: string): MisconceptionDef | undefined {
  return MISCONCEPTIONS.get(id);
}

export function hintsFor(misconceptionId: string): HintDef | undefined {
  return HINTS.get(misconceptionId);
}

export function theoryFor(id: string): TheoryDef | undefined {
  return THEORY.get(id);
}

/** Experiment ids for generateStaticParams. */
export function allExperimentParams(): { lab: LabId; level: LevelId; id: string }[] {
  return ALL_EXPERIMENTS.map((e) => ({ lab: e.lab, level: e.level, id: e.id }));
}
