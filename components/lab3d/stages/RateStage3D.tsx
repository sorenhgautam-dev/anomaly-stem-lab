"use client";

import { useEffect } from "react";
import { Vector3 } from "three";
import { useLab } from "@/lib/store";
import { labView, setAnchor } from "../lab-state";
import { Readout } from "../kit/chem/instruments";
import { RaceBeaker } from "../kit/chem/heat/RaceBeaker";
import { useSnapshot } from "../kit/chem/heat/useSnapshot";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Reaction speed and temperature, in 3D (stage "rate", engine/chemistry/
 * rate.ts): two identical fizzy tablets race in a beaker of cold water (ice
 * floating, plate off) and one of hot water (plate glowing, steam rising)
 * (DESIGN.md §7.5, §8.1 "bubbling and fizzing"). Run: each tablet shrinks
 * and bubbles at the simulator's rate, a stopwatch counts real seconds (the
 * run is a time-lapse) and each lane says when its tablet is done. After a
 * wrong run wire volt tablets show where the student's idea says each
 * tablet would be, and a dashed label gives the finish it expected.
 */

const COLD_X = -0.48;
const HOT_X = 0.48;
const GHOST_AT: [number, number, number] = [0, 1.22, 0];

function setting(raw: unknown, fallback: number): number {
  return typeof raw === "number" ? raw : fallback;
}

export function rateShots(): StageShots {
  const aim: [number, number, number] = [0, 0.48, 0];
  return {
    arrive: orbit(aim, 8.6, 40, 30),
    build: orbit(aim, 4.4, 16),
    predict: orbit(aim, 4.2, 14, 6),
    run: orbit([0.02, 0.48, 0], 4.1, 14, -4),
    reveal: orbit([0, 0.2, 0], 5.2, 16),
  };
}

export function RateStage3D() {
  const cold = useLab((s) => setting(s.build?.settings.cold, 10));
  const hot = useLab((s) => setting(s.build?.settings.hot, 60));
  const sv = useStageValues();
  const snap = useSnapshot(sv);
  const ghost = sv.ghost?.readings;
  const idea = ghost ? (Math.abs((ghost["hot.finish"] ?? 0) - (ghost["cold.finish"] ?? 0)) < 0.5 ? `Your idea: both done in ${Math.round(ghost["hot.finish"] ?? 0)} s` : `Your idea: hot done in ${Math.round(ghost["hot.finish"] ?? 0)} s`) : null;

  useEffect(() => {
    // Beside the hot lane (it wins the race); Ano parks between the beakers without hiding either.
    setAnchor("focus", new Vector3(HOT_X + 0.3, 0.3, 0.3));
    setAnchor("ghost", new Vector3(...GHOST_AT));
    return () => void labView.anchors.delete("ghost");
  }, []);

  return (
    <group>
      <RaceBeaker side="cold" label="Cold water" celsius={cold} x={COLD_X} sv={sv} snap={snap} />
      <RaceBeaker side="hot" label="Hot water" celsius={hot} x={HOT_X} sv={sv} snap={snap} />
      <Readout text={() => `${Math.round(snap.now.clock ?? 0)} s\nreal time`} style="screen" height={0.075} position={[0, 0.98, 0]} />
      {idea && <Readout text={() => idea} style="ghost" height={0.09} position={GHOST_AT} />}
    </group>
  );
}
