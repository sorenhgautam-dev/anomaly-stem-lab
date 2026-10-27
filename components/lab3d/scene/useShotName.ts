import { useLab } from "@/lib/store";
import { useLabUi } from "../lab-ui";
import type { ShotName, StageShots } from "../shots";

/** Which camera shot the lab is on (DESIGN.md §8.1): shared by the camera and Ano. */
export function useShotName(shots: StageShots): ShotName {
  const phase = useLab((s) => s.phase);
  const predicted = useLab((s) => s.prediction !== null);
  const particles = useLabUi((s) => s.particles);
  return particles && shots.particles ? "particles" : phase === "running" ? "run" : phase === "result" ? "reveal" : predicted ? "predict" : "build";
}
