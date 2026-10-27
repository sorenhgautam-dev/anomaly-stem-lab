import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { StageValues } from "../../../useStageValues";

/*
 * The stage values sampled once per frame, before anything draws (priority
 * −1): sv.now() and sv.ghostNow() build a new record on every call, so the
 * many getters of a stage read this snapshot instead (CLAUDE.md §9).
 */

export class Snapshot {
  now: Record<string, number> = {};
  ghost: Record<string, number> | null = null;
  pull(sv: StageValues): void {
    this.now = sv.now();
    this.ghost = sv.ghostNow();
  }
}

export function useSnapshot(sv: StageValues): Snapshot {
  const [snap] = useState(() => new Snapshot());
  useFrame(() => snap.pull(sv), -1);
  return snap;
}
