import type { LabModels } from "../types";
import { circuitWrongModels, realCircuit } from "./models";

/** Circuit stage (robotics lab): real MNA solve plus one wrong model per circuit misconception. */
export const circuitModels: LabModels = {
  stages: { circuit: realCircuit },
  wrongModels: circuitWrongModels,
};
