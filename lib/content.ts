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
import * as manifest from "./content-manifest";

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

export const EXPERIMENTS: ExperimentDef[] = parseAll(manifest.experiments, experimentSchema, "experiment");
const MISCONCEPTIONS = new Map(
  parseAll(manifest.misconceptions, misconceptionSchema, "misconception").map((m) => [m.id, m]),
);
const HINTS = new Map(parseAll(manifest.hints, hintSchema, "hint").map((h) => [h.misconceptionId, h]));
const THEORY = new Map(parseAll(manifest.theory, theorySchema, "theory").map((t) => [t.id, t]));

export const LAB_IDS: LabId[] = ["robotics", "chemistry"];
export const LEVEL_IDS: LevelId[] = ["easy", "medium", "advanced"];

export interface LevelInfo {
  id: LevelId;
  title: string;
  grades: string;
  line: string;
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
const COMING_SOON = comingSoon as ComingSoon[];

export function isLab(value: string): value is LabId {
  return (LAB_IDS as string[]).includes(value);
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
  return EXPERIMENTS.find((e) => e.id === id);
}

/** The playable experiments of a lab and level, in unlock order. */
export function experimentsFor(lab: LabId, level: LevelId): ExperimentDef[] {
  return EXPERIMENTS.filter((e) => e.lab === lab && e.level === level).sort((a, b) => a.order - b.order);
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
  return EXPERIMENTS.map((e) => ({ lab: e.lab, level: e.level, id: e.id }));
}
