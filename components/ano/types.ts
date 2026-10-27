/*
 * Ano's moods and moves (DESIGN.md §6). Pages pick an expression and, for a
 * one-off move, an action with a key that changes each time it should play.
 */

export type AnoExpression = "happy" | "curious" | "thinking" | "surprised" | "celebrating";

export type AnoMove = "wave" | "nod" | "hop" | "spin" | "boop" | "shrug";

export interface AnoAction {
  move: AnoMove;
  /** Change it to play the move again. */
  key: number;
}

/** Standing in the open, or peeking round a card edge. */
export type AnoPose = "stand" | "peek";

export const EXPRESSIONS: AnoExpression[] = ["happy", "curious", "thinking", "surprised", "celebrating"];
export const MOVES: AnoMove[] = ["wave", "nod", "hop", "spin", "shrug"];
