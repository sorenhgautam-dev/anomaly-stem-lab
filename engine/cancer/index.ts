import type { LabModels } from "../types";
import { cellsWrongModels, simulateCells } from "./cells";
import { chemoWrongModels, simulateChemo } from "./chemo";
import { simulateTumour, tumourWrongModels } from "./tumour";
import { simulateUv, uvWrongModels } from "./uv";

/*
 * The cancer labs' teaching models (CLAUDE.md §3): one real model per stage,
 * one wrong model per misconception id. Each stage file documents its
 * settings, readings and timeline values. These are teaching models, simple
 * and consistent with the cited sources, never medical ones.
 */
export const cancerModels: LabModels = {
  stages: {
    chemo: simulateChemo,
    tumour: simulateTumour,
    cells: simulateCells,
    uv: simulateUv,
  },
  wrongModels: {
    ...chemoWrongModels,
    ...tumourWrongModels,
    ...cellsWrongModels,
    ...uvWrongModels,
  },
};
