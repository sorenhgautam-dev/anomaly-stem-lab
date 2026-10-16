import { SLOT_LENGTH, type BoardDef, type BoardSlot, type Build, type Connection } from "@/engine/types";

/*
 * Geometry for the circuit board (board units, 1000 × 600). A slot's
 * terminals sit at ±SLOT_LENGTH / 2 along its axis: horizontal slots have a
 * on the left and b on the right; vertical slots have a on top.
 */

export interface Pt {
  x: number;
  y: number;
}

export function terminalPoint(slot: BoardSlot, end: "a" | "b"): Pt {
  const half = SLOT_LENGTH / 2;
  const sign = end === "a" ? -1 : 1;
  return slot.orientation === "h" ? { x: slot.x + sign * half, y: slot.y } : { x: slot.x, y: slot.y + sign * half };
}

export function slotById(board: BoardDef, id: string): BoardSlot | undefined {
  return board.slots.find((s) => s.id === id);
}

/** "slot.a" → point, or null if the slot doesn't exist. */
export function terminalRefPoint(board: BoardDef, ref: string): Pt | null {
  const [slotId, end] = ref.split(".");
  const slot = slotById(board, slotId);
  if (!slot || (end !== "a" && end !== "b")) return null;
  return terminalPoint(slot, end);
}

function sameWire(a: Connection, from: string, to: string): boolean {
  return (a.from === from && a.to === to) || (a.from === to && a.to === from);
}

export interface WireShape {
  key: string;
  connection: Connection;
  points: Pt[];
  /** Added by the student, not part of the printed board. */
  added: boolean;
}

/**
 * Every connection in the build as a polyline: board wires use their drawn
 * corner points; wires the student added get a simple right-angled route.
 */
export function wireShapes(board: BoardDef, build: Build): WireShape[] {
  const shapes: WireShape[] = [];
  for (const connection of build.connections) {
    const from = terminalRefPoint(board, connection.from);
    const to = terminalRefPoint(board, connection.to);
    if (!from || !to) continue;
    const printed = board.wires.find((w) => sameWire(w, connection.from, connection.to));
    let points: Pt[];
    if (printed) {
      const via = (printed.via ?? []).map(([x, y]) => ({ x, y }));
      // Walk the drawn route in the direction of this connection.
      const forward = printed.from === connection.from;
      points = forward ? [from, ...via, to] : [from, ...via.reverse(), to];
    } else {
      points = from.x === to.x || from.y === to.y ? [from, to] : [from, { x: to.x, y: from.y }, to];
    }
    shapes.push({ key: `${connection.from}|${connection.to}`, connection, points, added: !printed });
  }
  return shapes;
}

export function polyline(points: Pt[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

/** Signed current through a connection from its `from` end to its `to` end. */
export function flowFor(flows: Record<string, number> | undefined, connection: Connection): number {
  if (!flows) return 0;
  const forward = flows[`${connection.from}|${connection.to}`];
  if (forward !== undefined) return forward;
  const backward = flows[`${connection.to}|${connection.from}`];
  return backward !== undefined ? -backward : 0;
}

/** Rotation (degrees) to draw a horizontally-modelled part in this slot. */
export function slotRotation(slot: BoardSlot): number {
  return slot.orientation === "h" ? 0 : 90;
}
