"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { ExperimentDef, Prediction } from "@/engine/types";
import { useLab, verdictShown } from "@/lib/store";
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

/** The student's prediction as words, with its unit for a slider. */
export function predictionWords(def: ExperimentDef | null, prediction: Prediction | null): string {
  if (!prediction) return "";
  if (prediction.type === "choice") return prediction.value;
  const unit = def?.prediction.type === "slider" ? (def.prediction.unit ?? "") : "";
  return `${Math.round(prediction.value * 100) / 100}${unit ? ` ${unit}` : ""}`;
}

export function PredictionGhost() {
  const def = useLab((s) => s.def);
  const prediction = useLab((s) => s.prediction);
  const stageGhost = useLab((s) => verdictShown(s) === "wrong" && !!s.result?.diagnosis?.ghost);
  const correct = useLab((s) => verdictShown(s) === "correct");
  // A "What if?" run explores a change: there's no guess of the student's to show beside it.
  const exploring = useLab((s) => !!s.explore);
  // Hidden inside the particle dive, where it would fill the view.
  const zoomed = useLabUi((s) => s.particles);
  const board = useMemo(() => new TextBoard("ghost", 0.12, 24), []);
  const [hover] = useState(() => new Hover());
  const group = useRef<Group>(null);
  const value = predictionWords(def, prediction);
  // Long answers wrap onto a second line so the label stays clear of the HUD.
  const text = !prediction ? "" : value.length > 16 ? `Your idea:\n${value}` : `Your idea: ${value}`;
  const show = !!prediction && !correct && !stageGhost && !zoomed && !exploring;

  useEffect(() => {
    if (text) board.set(text);
  }, [board, text]);
  useEffect(() => () => board.dispose(), [board]);

  useFrame(({ clock }, delta) => {
    // A selected part's inspect label may be carrying the idea already (labView.idea).
    if (group.current) hover.step(group.current, board, show && !labView.idea, Math.min(delta, 1 / 30), clock.elapsedTime, prefersReducedMotion());
  });

  return (
    <group ref={group} visible={false}>
      <primitive object={board.sprite} />
    </group>
  );
}
