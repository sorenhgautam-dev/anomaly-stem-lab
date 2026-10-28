import { z } from "zod";
import rootsJson from "@/content/root-beliefs.json";
import { getExperiment } from "@/lib/content";

/*
 * The root belief finder. Several tricky ideas in the misconception
 * catalogue grow from one bigger idea ("heat always means more"). Each
 * wrong guess the simulator diagnosed is saved as (experiment, idea) in
 * progress.suspected; here they are grouped by the root idea they share.
 * A root counts once two or more different wrong guesses share it: the same
 * guess repeated in the same experiment is one guess, not a pattern.
 */

const rootSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  /** Plain words that finish "…come from the same idea: ___." */
  plainWords: z.string().min(1),
  /** What Ano says about this root idea, in his own words. */
  anoLine: z.string().min(1),
  /** The tricky ideas (misconception ids) that grow from it; filled in as their experiments are built. */
  misconceptions: z.array(z.string().regex(/^[a-z0-9-]+$/)),
});

export type RootBelief = z.infer<typeof rootSchema>;

export const ROOT_BELIEFS: RootBelief[] = z.array(rootSchema).parse(rootsJson);

/** Wrong guesses that share a root before Ano calls it out. */
export const ROOT_AFTER = 2;

export interface WrongGuess {
  experimentId: string;
  misconceptionId: string;
}

export interface RootMatch {
  root: RootBelief;
  guesses: WrongGuess[];
  /** The experiments these guesses came from, in the order they were made. */
  experimentIds: string[];
}

export function rootFor(misconceptionId: string): RootBelief | undefined {
  return ROOT_BELIEFS.find((r) => r.misconceptions.includes(misconceptionId));
}

/** Every diagnosed wrong guess, one per experiment and idea, from saved progress. */
export function wrongGuesses(suspected: Record<string, string[]>): WrongGuess[] {
  return Object.entries(suspected).flatMap(([experimentId, ids]) => [...new Set(ids)].map((misconceptionId) => ({ experimentId, misconceptionId })));
}

/** Roots shared by at least ROOT_AFTER wrong guesses, the biggest first. */
export function findRoots(suspected: Record<string, string[]>): RootMatch[] {
  const byRoot = new Map<string, WrongGuess[]>();
  for (const guess of wrongGuesses(suspected)) {
    const root = rootFor(guess.misconceptionId);
    if (!root) continue;
    byRoot.set(root.id, [...(byRoot.get(root.id) ?? []), guess]);
  }
  return ROOT_BELIEFS.flatMap((root) => {
    const guesses = byRoot.get(root.id) ?? [];
    if (guesses.length < ROOT_AFTER) return [];
    const experimentIds = [...new Set(guesses.map((g) => g.experimentId))].filter((id) => getExperiment(id));
    return [{ root, guesses, experimentIds }];
  }).sort((a, b) => b.guesses.length - a.guesses.length);
}

/** The root a just-diagnosed idea belongs to, once it has become a pattern. */
export function rootMatchFor(misconceptionId: string | null, suspected: Record<string, string[]>): RootMatch | null {
  if (!misconceptionId) return null;
  return findRoots(suspected).find((m) => m.root.misconceptions.includes(misconceptionId)) ?? null;
}

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** "Three of your wrong guesses come from the same idea: heat always means more." */
export function rootLine(match: RootMatch): string {
  const n = match.guesses.length;
  const count = WORDS[n] ?? String(n);
  return `${count} of your wrong guesses come from the same idea: ${match.root.plainWords}.`;
}
