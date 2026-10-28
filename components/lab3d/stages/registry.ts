import type { ComponentType } from "react";
import type { ExperimentDef, StageId } from "@/engine/types";
import type { ShotsFor } from "../shots";
import { BurnStage3D, burnShots } from "./BurnStage3D";
import { CatalystStage3D, catalystShots } from "./CatalystStage3D";
import { CircuitStage3D, circuitShots } from "./CircuitStage3D";
import { DissolveStage3D, dissolveShots } from "./DissolveStage3D";
import { EquilibriumStage3D, equilibriumShots } from "./EquilibriumStage3D";
import { FizzStage3D, fizzShots } from "./FizzStage3D";
import { GasHeatStage3D, gasHeatShots } from "./GasHeatStage3D";
import { GasLawStage3D, gasLawShots } from "./GasLawStage3D";
import { GearsStage3D, gearsShots } from "./GearsStage3D";
import { IndicatorStage3D, indicatorShots } from "./IndicatorStage3D";
import { MeltStage3D, meltShots } from "./MeltStage3D";
import { NeutraliseStage3D, neutraliseShots } from "./NeutraliseStage3D";
import { PwmStage3D, pwmShots } from "./PwmStage3D";
import { RateStage3D, rateShots } from "./RateStage3D";
import { RobotStage3D, robotShots } from "./RobotStage3D";

/*
 * Every stage's 3D apparatus (DESIGN.md §7.5: "All experiments are 3D"),
 * each built from the shared kit in components/lab3d/kit. The record covers
 * every StageId, so a new stage can't ship without its 3D apparatus.
 */

export interface Stage3D {
  Stage: ComponentType;
  shots: ShotsFor;
  /** What the dots are in the zoomed-in view, if the stage has one. */
  zoom?: { label: string; caption: string };
}

const STAGES: Record<StageId, Stage3D> = {
  circuit: { Stage: CircuitStage3D, shots: circuitShots, zoom: { label: "Zoom in on the flow", caption: "Zoomed in: the dots are electricity flowing round the loop. They move faster when more flows." } },
  fizz: { Stage: FizzStage3D, shots: fizzShots, zoom: { label: "Zoom to particles", caption: "Zoomed in: each dot is a tiny bit of the gas (carbon dioxide)." } },
  robot: { Stage: RobotStage3D, shots: robotShots },
  gears: { Stage: GearsStage3D, shots: gearsShots },
  pwm: { Stage: PwmStage3D, shots: pwmShots },
  melt: { Stage: MeltStage3D, shots: meltShots, zoom: { label: "Zoom to particles", caption: "Zoomed in: each dot is a tiny bit of water. Heat makes them jiggle harder until they break free of the ice." } },
  dissolve: { Stage: DissolveStage3D, shots: dissolveShots, zoom: { label: "Zoom to particles", caption: "Zoomed in: blue dots are tiny bits of water, white ones are sugar. Every bit of sugar is still in the beaker." } },
  heat: { Stage: GasHeatStage3D, shots: gasHeatShots, zoom: { label: "Zoom to particles", caption: "Zoomed in: each dot is a tiny bit of air. Warm air moves faster. The bits themselves don’t grow." } },
  rate: { Stage: RateStage3D, shots: rateShots },
  indicator: { Stage: IndicatorStage3D, shots: indicatorShots },
  neutralise: { Stage: NeutraliseStage3D, shots: neutraliseShots },
  burn: { Stage: BurnStage3D, shots: burnShots, zoom: { label: "Zoom to particles", caption: "Zoomed in: each dot is an oxygen molecule in the jar." } },
  gaslaw: { Stage: GasLawStage3D, shots: gasLawShots, zoom: { label: "Zoom to particles", caption: "Zoomed in: each dot is an air molecule. Squeezed into less space, they hit the plunger more often." } },
  catalyst: { Stage: CatalystStage3D, shots: catalystShots },
  equilibrium: { Stage: EquilibriumStage3D, shots: equilibriumShots, zoom: { label: "Zoom to particles", caption: "Zoomed in: brown pairs are nitrogen dioxide (NO₂), grey ones are dinitrogen tetroxide (N₂O₄)." } },
};

export function stage3d(def: ExperimentDef): Stage3D {
  return STAGES[def.stage];
}
