"use client";

import { useEffect, useMemo } from "react";
import { TextBoard } from "../../TextBoard";

/*
 * The student's belief after a wrong run (DESIGN.md §8.1 step 5): a dashed
 * teal "Your idea: …" label placed beside the reading it disagrees with.
 * Hidden while `text` is null. A new text gets a fresh board, so its canvas
 * never changes size after the texture is uploaded.
 */

export function GhostLabel({ text, height = 0.12, position }: { text: string | null; height?: number; position: [number, number, number] }) {
  const board = useMemo(() => {
    const b = new TextBoard("ghost", height, 24);
    if (text) b.set(text);
    return b;
  }, [height, text]);
  useEffect(() => () => board.dispose(), [board]);
  return text ? <primitive object={board.sprite} position={position} /> : null;
}
