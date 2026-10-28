"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { SpriteMaterial } from "three";
import { labView } from "../../lab-state";
import { useLabUi } from "../../lab-ui";
import { useStageValues } from "../../useStageValues";
import { TextBoard } from "../TextBoard";

/*
 * Click a part to inspect it (DESIGN.md §8.1 step 2): a glass label over the
 * part with its name and what it is, and once the circuit runs, the live
 * current through it and the voltage across it (ramping up with the run),
 * plus the student's idea after a wrong run.
 */

const RAMP_S = 0.6;

export function InspectLabel({ slot, title, idea = null }: { slot: string; title: string; idea?: string | null }) {
  const sv = useStageValues();
  const board = useMemo(() => {
    const b = new TextBoard("glass", 0.15, 24);
    // Always drawn over everything, and anchored by its bottom edge, so it sits above the part on screen, never on it;
    // nudged left of centre, toward the middle of the board (lamps sit at its ends, by the inspector).
    (b.sprite.material as SpriteMaterial).depthTest = false;
    b.sprite.center.set(0.62, -0.12);
    return b;
  }, []);
  // Hidden while the camera dives in close, where it would fill the view.
  const zoomed = useLabUi((s) => s.particles);
  useEffect(() => () => board.dispose(), [board]);
  // While this label carries the idea, the floating "Your idea" label steps aside.
  useEffect(() => {
    labView.idea = !!idea;
    return () => {
      labView.idea = false;
    };
  }, [idea]);
  useFrame(() => {
    const r = sv.outcome?.readings;
    if (!r) return board.set(title);
    const k = Math.min(1, sv.t() / RAMP_S);
    const amps = (r[`${slot}.current`] ?? 0) * k;
    const volts = (r[`${slot}.voltage`] ?? 0) * k;
    // After a wrong run, reality and the student's idea read as one label.
    board.set(`${title}\n${(amps * 1000).toFixed(1)} mA · ${volts.toFixed(2)} V${idea ? `\n${idea}` : ""}`);
  });
  return <primitive object={board.sprite} position={[0, 0.44, 0]} visible={!zoomed} />;
}
