import type { LabId } from "@/engine/types";
import { useStudioEnvironment } from "@/components/three/studio-env";

/** Light a view the way its lab is lit (the lab scene and the kit gallery share it). */
export function useLabEnvironment(lab: LabId): void {
  useStudioEnvironment(1.12, lab);
}
