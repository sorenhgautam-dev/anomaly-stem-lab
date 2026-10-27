"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useLabUi } from "../../lab-ui";
import { useStageValues } from "../../useStageValues";
import { TextBoard } from "../TextBoard";

/*
 * Click a part to inspect it (DESIGN.md §8.1 step 2): a glass label over the
 * part with its name and what it is, and once the circuit runs, the live
 * current through it and the voltage across it (ramping up with the run).
 */

const RAMP_S = 0.6;

export function InspectLabel({ slot, title }: { slot: string; title: string }) {
  const sv = useStageValues();
  const board = useMemo(() => new TextBoard("glass", 0.15, 24), []);
  // Hidden while the camera dives in close, where it would fill the view.
  const zoomed = useLabUi((s) => s.particles);
  useEffect(() => () => board.dispose(), [board]);
  useFrame(() => {
    const r = sv.outcome?.readings;
    if (!r) return board.set(title);
    const k = Math.min(1, sv.t() / RAMP_S);
    const amps = (r[`${slot}.current`] ?? 0) * k;
    const volts = (r[`${slot}.voltage`] ?? 0) * k;
    board.set(`${title}\n${(amps * 1000).toFixed(1)} mA · ${volts.toFixed(2)} V`);
  });
  return <primitive object={board.sprite} position={[0, 0.34, 0]} visible={!zoomed} />;
}
