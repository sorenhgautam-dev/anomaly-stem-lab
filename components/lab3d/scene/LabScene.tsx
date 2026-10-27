"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useLab } from "@/lib/store";
import { useStudioEnvironment } from "@/components/three/studio-env";
import { benchShots, fitShots } from "../shots";
import { labView } from "../lab-state";
import { Vfx } from "../kit/VfxPool";
import { stage3d } from "../stages/registry";
import { CameraDirector } from "./CameraDirector";
import { LabAno } from "./LabAno";
import { PredictionGhost } from "./PredictionGhost";
import { Studio } from "./Studio";
import { VerdictBurst } from "./VerdictBurst";

/*
 * The experiment's one continuous 3D space (DESIGN.md §8.1): the studio, the
 * camera director, the stage's apparatus from the kit, Ano, the pooled VFX
 * and the verdict burst. Drawn by the site canvas into the lab view.
 */

export function LabScene({ track }: { track: React.RefObject<HTMLElement | null> }) {
  useStudioEnvironment(1.12);
  const def = useLab((s) => s.def);
  const build = useLab((s) => s.build);
  const entry = def ? stage3d(def) : undefined;
  // Memoised per experiment: new shots every render would make the camera
  // re-aim constantly and fight the student's orbit.
  const base = useMemo(() => (def && entry ? entry.shots(def) : benchShots(0, 0.2, 3)), [def, entry]);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const shots = useMemo(() => fitShots(base, width, height), [base, width, height]);
  // A stage's named anchors belong to it: drop them when the experiment changes
  // (cleanups run before the next stage's effects set its own).
  useEffect(
    () => () => {
      labView.anchors.delete("focus");
      labView.anchors.delete("ghost");
    },
    [def],
  );
  if (!def) return null;
  const Stage = entry?.Stage;
  return (
    <>
      <CameraDirector shots={shots} />
      <Studio lab={def.lab} shadowKey={`${def.id}-${build?.parts.length ?? 0}-${JSON.stringify(build?.settings ?? {})}`} />
      {Stage && <Stage />}
      <PredictionGhost />
      <LabAno track={track} shots={shots} />
      <Vfx />
      <VerdictBurst />
    </>
  );
}
