import { cancerModels } from "./cancer";
import { chemistryModels } from "./chemistry";
import { circuitModels } from "./circuits";
import { robotModels } from "./robotics";
import type { LabModels, Simulate, StageId } from "./types";

/*
 * Where the engine finds physics. Each lab folder exports its LabModels;
 * experiments name a stage (real model) and misconception ids (wrong models).
 */

const LABS: LabModels[] = [cancerModels, circuitModels, robotModels, chemistryModels];

export function realModel(stage: StageId): Simulate {
  for (const lab of LABS) {
    const model = lab.stages[stage];
    if (model) return model;
  }
  throw new Error(`No real model for stage "${stage}"`);
}

export function wrongModel(misconceptionId: string): Simulate | undefined {
  for (const lab of LABS) {
    const model = lab.wrongModels[misconceptionId];
    if (model) return model;
  }
  return undefined;
}
