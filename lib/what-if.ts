import { z } from "zod";
import whatIfJson from "@/content/what-if.json";
import { applyEdit, sameBuild } from "@/engine/edits";
import { editDef } from "@/engine/schema";
import type { Build } from "@/engine/types";
import { formatReadout, readoutSchema, sameShown, type Readout } from "@/lib/readout";

/*
 * "What if?" buttons: two or three one-click changes per experiment
 * (content/what-if.json) that set up a variation and run it straight away.
 * The simulator runs the changed build as usual; these helpers only build
 * the change and put Ano's reaction into words from the real readings.
 */

const variantSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Button text, e.g. "Open the bag". */
  label: z.string().min(1).max(40),
  edits: z.array(editDef).min(1),
  /** The readings worth showing afterwards; Ano talks about the first. */
  show: z.array(readoutSchema).min(1).max(2),
});

export type WhatIf = z.infer<typeof variantSchema>;

const WHAT_IFS: Record<string, WhatIf[]> = z.record(z.string(), z.array(variantSchema).min(2).max(3)).parse(whatIfJson);

export function whatIfsFor(experimentId: string): WhatIf[] {
  return WHAT_IFS[experimentId] ?? [];
}

export function applyWhatIf(build: Build, variant: WhatIf): Build {
  return variant.edits.reduce(applyEdit, build);
}

/** The variations that would change this build (a "Seal the bag" on a sealed bag is hidden). */
export function usefulWhatIfs(experimentId: string, build: Build): WhatIf[] {
  return whatIfsFor(experimentId).filter((v) => !sameBuild(applyWhatIf(build, v), build));
}

/** "the scale at the end went from 130.00 g to 127.51 g" */
export function changeText(r: Readout, before: number | undefined, after: number | undefined): string {
  if (after === undefined) return `${r.name} gave no reading`;
  if (before === undefined) return `${r.name} showed ${formatReadout(after, r)}`;
  if (sameShown(before, after, r)) return `${r.name} stayed at ${formatReadout(after, r)}`;
  return `${r.name} went from ${formatReadout(before, r)} to ${formatReadout(after, r)}`;
}

/** Ano's reaction: what changed, in real numbers from the two runs. */
export function whatIfLine(variant: WhatIf, before: Record<string, number> | null, after: Record<string, number>): string {
  const r = variant.show[0];
  const text = changeText(r, before?.[r.key], after[r.key]);
  return `${variant.label}: ${text}. ${before ? "Did you guess that?" : "What do you notice?"}`;
}
