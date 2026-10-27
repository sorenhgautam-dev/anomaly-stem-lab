"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useLab } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";
import { labView } from "../lab-state";
import { useLabUi } from "../lab-ui";
import { TextBoard } from "../kit/TextBoard";

/*
 * The student's prediction as a ghost in the scene (DESIGN.md §8.1 step 3):
 * once a prediction is picked, a dashed volt label "Your idea: …" floats over
 * the part that shows the result, through the run and into the reveal, so
 * the ghost and reality end up side by side. A stage that draws its own
 * richer ghost after a wrong run (a ghost LED, a ghost scale reading) takes
 * over from it then.
 */

/** Fades the label in and out and bobs it gently over the focus anchor. */
class Hover {
  private k = 0;
  step(group: Group, board: TextBoard, show: boolean, dt: number, time: number, still: boolean) {
    this.k += ((show ? 1 : 0) - this.k) * (1 - Math.exp(-dt * 6));
    board.setOpacity(this.k);
    group.visible = this.k > 0.01;
    // A stage can place the ghost exactly ("ghost", e.g. on the scale's screen); else over the focus.
    const own = labView.anchors.get("ghost");
    const at = own ?? labView.anchors.get("focus");
    if (at) group.position.set(at.x, at.y + (own ? 0 : 0.42) + (still ? 0 : Math.sin(time * 1.6) * 0.02), at.z);
  }
}

export function PredictionGhost() {
  const def = useLab((s) => s.def);
  const prediction = useLab((s) => s.prediction);
  const stageGhost = useLab((s) => s.phase === "result" && s.result?.verdict === "wrong" && !!s.result.diagnosis?.ghost);
  const correct = useLab((s) => s.phase === "result" && s.result?.verdict === "correct");
  // Hidden inside the particle dive, where it would fill the view.
  const zoomed = useLabUi((s) => s.particles);
  const board = useMemo(() => new TextBoard("ghost", 0.15, 24), []);
  const [hover] = useState(() => new Hover());
  const group = useRef<Group>(null);
  const unit = def?.prediction.type === "slider" ? (def.prediction.unit ?? "") : "";
  const value = !prediction ? "" : prediction.type === "choice" ? prediction.value : `${Math.round(prediction.value * 100) / 100}${unit ? ` ${unit}` : ""}`;
  // Long answers wrap onto a second line so the label stays clear of the HUD.
  const text = !prediction ? "" : value.length > 16 ? `Your idea:\n${value}` : `Your idea: ${value}`;
  const show = !!prediction && !correct && !stageGhost && !zoomed;

  useEffect(() => {
    if (text) board.set(text);
  }, [board, text]);
  useEffect(() => () => board.dispose(), [board]);

  useFrame(({ clock }, delta) => {
    if (group.current) hover.step(group.current, board, show, Math.min(delta, 1 / 30), clock.elapsedTime, prefersReducedMotion());
  });

  return (
    <group ref={group} visible={false}>
      <primitive object={board.sprite} />
    </group>
  );
}
