"use client";

import { useEffect, useMemo } from "react";
import { TextBoard } from "../../TextBoard";

/*
 * The student's wrong idea beside reality (DESIGN.md §8.1 step 5): a dashed
 * teal "Your idea: …" label beside the reading it disagrees with, shown only
 * after a wrong run (before that the scene's PredictionGhost floats the
 * picked option at the stage's "ghost" anchor). The dashed border carries
 * the meaning, not only colour (CLAUDE.md §9).
 */

export function GhostLabel({ text, height = 0.11, position }: { text: string | null; height?: number; position?: [number, number, number] }) {
  // A new board per text: a board's texture keeps the size it was first drawn at.
  const board = useMemo(() => {
    if (text === null) return null;
    const b = new TextBoard("ghost", height, 22);
    b.set(text);
    return b;
  }, [text, height]);
  useEffect(() => () => board?.dispose(), [board]);
  return board ? <primitive object={board.sprite} position={position} /> : null;
}
