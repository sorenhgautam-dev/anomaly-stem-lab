"use client";

import type { Build, ExperimentDef, Outcome } from "@/engine/types";
import type { LabPhase } from "@/lib/store";
import { ChemistryStage } from "@/components/chemistry/ChemistryStage";
import { GearsStage } from "@/components/robotics/GearsStage";
import { PwmStage } from "@/components/robotics/PwmStage";
import { RobotArena } from "@/components/robotics/RobotArena";

/*
 * Stage renderers for everything except the circuit board (which needs the
 * parts tray). Each draws the experiment from the build and, once a run
 * starts, animates the outcome's timeline via the playback clock. `ghost` is
 * the student's belief after a wrong verdict.
 */

export interface StageProps {
  def: ExperimentDef;
  build: Build;
  outcome: Outcome | null;
  ghost: Outcome | null;
  phase: LabPhase;
}

export function StageRenderer(props: StageProps) {
  switch (props.def.stage) {
    case "robot":
      return <RobotArena {...props} />;
    case "gears":
      return <GearsStage {...props} />;
    case "pwm":
      return <PwmStage {...props} />;
    // Chemistry benches (and anything not listed above) go to ChemistryStage.
    default:
      return <ChemistryStage {...props} />;
  }
}
