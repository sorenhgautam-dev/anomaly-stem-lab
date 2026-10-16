import { lusolve, type MathArray } from "mathjs";

/*
 * Modified Nodal Analysis for a network of two-terminal elements.
 *
 * Unknowns: the voltage of every node except ground, plus the current through
 * every source branch. Resistors are stamped into the conductance matrix G.
 * A source branch adds one row and column:
 *
 *     V(from) − V(to) − ohms · I = volts       (I flows from → to through it)
 *
 * which models a battery (EMF + internal resistance) or a conducting LED
 * (forward voltage + series resistance). Every node also gets gmin to ground,
 * so floating islands and open circuits never make the matrix singular.
 * Solved with mathjs `lusolve`; on any failure the solution is all zeros.
 */

export type Element =
  | { kind: "resistor"; id: string; from: string; to: string; ohms: number }
  | { kind: "source"; id: string; from: string; to: string; volts: number; ohms: number };

/** Conductance from every node to ground (S). */
export const GMIN = 1e-9;

export interface NetworkSolution {
  /** Node voltage relative to ground (0 for unknown nodes). */
  voltage(node: string): number;
  /** Current through an element, from → to (0 for unknown ids). */
  current(id: string): number;
}

export function solveNetwork(elements: Element[], nodes: Iterable<string>, ground: string | null): NetworkSolution {
  const allNodes = new Set<string>(nodes);
  for (const e of elements) {
    allNodes.add(e.from);
    allNodes.add(e.to);
  }
  const ref = ground ?? allNodes.values().next().value ?? null;

  const index = new Map<string, number>();
  for (const node of allNodes) if (node !== ref) index.set(node, index.size);
  const sources = elements.filter((e) => e.kind === "source");
  const sourceRow = new Map<string, number>();
  for (const s of sources) sourceRow.set(s.id, index.size + sourceRow.size);
  const n = index.size + sources.length;

  const A: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const b = new Array<number>(n).fill(0);
  const at = (node: string) => index.get(node) ?? -1;

  for (let i = 0; i < index.size; i++) A[i][i] += GMIN;
  for (const e of elements) {
    const p = at(e.from);
    const q = at(e.to);
    if (e.kind === "resistor") {
      const g = 1 / e.ohms;
      if (p >= 0) A[p][p] += g;
      if (q >= 0) A[q][q] += g;
      if (p >= 0 && q >= 0) {
        A[p][q] -= g;
        A[q][p] -= g;
      }
    } else {
      const k = sourceRow.get(e.id) ?? -1;
      if (k < 0) continue;
      if (p >= 0) {
        A[p][k] += 1;
        A[k][p] += 1;
      }
      if (q >= 0) {
        A[q][k] -= 1;
        A[k][q] -= 1;
      }
      A[k][k] -= e.ohms;
      b[k] = e.volts;
    }
  }

  const x = solveLinear(A, b);
  const voltage = (node: string) => {
    const i = index.get(node);
    return i === undefined ? 0 : x[i];
  };
  const byId = new Map(elements.map((e) => [e.id, e]));
  return {
    voltage,
    current(id: string) {
      const e = byId.get(id);
      if (!e) return 0;
      if (e.kind === "resistor") return (voltage(e.from) - voltage(e.to)) / e.ohms;
      return x[sourceRow.get(e.id) ?? -1] ?? 0;
    },
  };
}

function solveLinear(A: number[][], b: number[]): number[] {
  const zeros = () => new Array<number>(b.length).fill(0);
  if (b.length === 0) return [];
  try {
    const raw = lusolve(A, b) as MathArray;
    const x = raw.map((row) => Number(Array.isArray(row) ? row[0] : row));
    return x.every(Number.isFinite) ? x : zeros();
  } catch {
    return zeros();
  }
}
