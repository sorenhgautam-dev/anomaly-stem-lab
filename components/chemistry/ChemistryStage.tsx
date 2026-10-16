"use client";

import type { StageProps } from "@/components/lab/stages";
import { BurnStage } from "./stages/BurnStage";
import { DissolveStage } from "./stages/DissolveStage";
import { GasHeatStage } from "./stages/GasHeatStage";
import { MeltStage } from "./stages/MeltStage";
import { RaceStage } from "./stages/RaceStage";
import { SealedBagStage } from "./stages/SealedBagStage";

/** Picks the chemistry bench for an experiment's stage. */
export function ChemistryStage(props: StageProps) {
  switch (props.def.stage) {
    case "fizz":
      return <SealedBagStage {...props} />;
    case "heat":
      return <GasHeatStage {...props} />;
    case "melt":
      return <MeltStage {...props} />;
    case "dissolve":
      return <DissolveStage {...props} />;
    case "rate":
      return <RaceStage {...props} />;
    case "burn":
      return <BurnStage {...props} />;
    default:
      return (
        <div className="grid size-full place-items-center p-8 text-center">
          <p className="max-w-sm text-[15px] text-pearl/60">
            This bench is still being drawn. The simulator already works: make your prediction and press Run.
          </p>
        </div>
      );
  }
}
