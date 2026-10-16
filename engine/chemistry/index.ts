import type { LabModels } from "../types";
import { burnWrongModels, simulateBurn } from "./burn";
import { catalystWrongModels, simulateCatalyst } from "./catalyst";
import { dissolveWrongModels, simulateDissolve } from "./dissolve";
import { equilibriumWrongModels, simulateEquilibrium } from "./equilibrium";
import { fizzWrongModels, simulateFizz } from "./fizz";
import { gaslawWrongModels, simulateGaslaw } from "./gaslaw";
import { heatWrongModels, simulateHeat } from "./heat";
import { indicatorWrongModels, simulateIndicator } from "./indicator";
import { meltWrongModels, simulateMelt } from "./melt";
import { neutraliseWrongModels, simulateNeutralise } from "./neutralise";
import { rateWrongModels, simulateRate } from "./rate";

/*
 * The chemistry lab's physics: one real model per stage, one wrong model per
 * misconception id. Each stage file documents its settings, readings and
 * timeline values (the UI renders from those names).
 */
export const chemistryModels: LabModels = {
  stages: {
    melt: simulateMelt,
    dissolve: simulateDissolve,
    fizz: simulateFizz,
    indicator: simulateIndicator,
    heat: simulateHeat,
    rate: simulateRate,
    neutralise: simulateNeutralise,
    burn: simulateBurn,
    gaslaw: simulateGaslaw,
    catalyst: simulateCatalyst,
    equilibrium: simulateEquilibrium,
  },
  wrongModels: {
    ...meltWrongModels,
    ...dissolveWrongModels,
    ...fizzWrongModels,
    ...indicatorWrongModels,
    ...heatWrongModels,
    ...rateWrongModels,
    ...neutraliseWrongModels,
    ...burnWrongModels,
    ...gaslawWrongModels,
    ...catalystWrongModels,
    ...equilibriumWrongModels,
  },
};
