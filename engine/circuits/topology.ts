import type { Build, PlacedPart, Simulation } from "../types";
import { NOISE, isClosed, placedParts, terminalA, terminalB } from "./parts";

/*
 * Graph helpers over slot terminals, used by the wrong models: how many hops
 * a part is from a battery terminal, which bulbs share one series chain, and
 * which wires bridge straight across a part.
 */

/** A link between two terminals: a connection ("conn:<i>") or a part ("part:<slot>"). */
export interface Link {
  key: string;
  a: string;
  b: string;
}

/** Every connection, plus a link across each part that passes `keep`. */
export function links(build: Build, keep: (part: PlacedPart) => boolean): Link[] {
  const out: Link[] = build.connections.map((c, i) => ({ key: `conn:${i}`, a: c.from, b: c.to }));
  for (const p of placedParts(build)) {
    if (keep(p)) out.push({ key: `part:${p.slot}`, a: terminalA(p.slot), b: terminalB(p.slot) });
  }
  return out;
}

function neighbours(graph: Link[]): Map<string, { to: string; link: Link }[]> {
  const adj = new Map<string, { to: string; link: Link }[]>();
  const add = (from: string, to: string, link: Link) => {
    const list = adj.get(from) ?? [];
    list.push({ to, link });
    adj.set(from, list);
  };
  for (const link of graph) {
    add(link.a, link.b, link);
    add(link.b, link.a, link);
  }
  return adj;
}

/** Breadth-first search from `start`: hops to each reachable terminal, and the link used to arrive. */
function search(graph: Link[], start: string) {
  const adj = neighbours(graph);
  const hops = new Map<string, number>([[start, 0]]);
  const via = new Map<string, { from: string; link: Link }>();
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    for (const { to, link } of adj.get(node) ?? []) {
      if (hops.has(to)) continue;
      hops.set(to, (hops.get(node) ?? 0) + 1);
      via.set(to, { from: node, link });
      queue.push(to);
    }
  }
  return { hops, via };
}

/** Hops from `start` to every terminal it can reach. */
export function hops(graph: Link[], start: string): Map<string, number> {
  return search(graph, start).hops;
}

/** Hops to the nearer terminal of a slot (Infinity if it can't be reached). */
export function slotHops(dist: Map<string, number>, slot: string): number {
  return Math.min(dist.get(terminalA(slot)) ?? Infinity, dist.get(terminalB(slot)) ?? Infinity);
}

/** The fewest links joining two terminals, or null when they aren't joined. */
export function shortestPath(graph: Link[], from: string, to: string): Link[] | null {
  const { hops: seen, via } = search(graph, from);
  if (!seen.has(to) || from === to) return null;
  const path: Link[] = [];
  for (let node = to; node !== from; ) {
    const step = via.get(node);
    if (!step) return null;
    path.push(step.link);
    node = step.from;
  }
  return path.reverse();
}

export function firstBattery(build: Build): PlacedPart | undefined {
  return placedParts(build).find((p) => p.kind === "battery");
}

class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    let root = x;
    while (this.parent.has(root) && this.parent.get(root) !== root) root = this.parent.get(root) ?? root;
    for (let node = x; node !== root; ) {
      const next = this.parent.get(node) ?? root;
      this.parent.set(node, root);
      node = next;
    }
    return root;
  }
  union(x: string, y: string): void {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx !== ry) this.parent.set(rx, ry);
  }
}

/**
 * Bulbs in series: current-carrying bulbs on one unbranched chain. Terminals
 * joined by wires or closed switches form one net; a net where exactly two
 * current-carrying parts meet joins them into the same chain.
 */
export function seriesBulbGroups(build: Build, sim: Simulation): string[][] {
  const parts = placedParts(build);
  const nets = new UnionFind();
  for (const c of build.connections) nets.union(c.from, c.to);
  for (const p of parts) {
    if (p.kind === "wire" || (p.kind === "switch" && isClosed(p))) nets.union(terminalA(p.slot), terminalB(p.slot));
  }
  const active = parts.filter(
    (p) =>
      p.kind !== "wire" &&
      p.kind !== "switch" &&
      (p.kind === "battery" || (sim.readings[`${p.slot}.current`] ?? 0) > NOISE),
  );
  const atNet = new Map<string, string[]>();
  for (const p of active) {
    for (const t of [terminalA(p.slot), terminalB(p.slot)]) {
      const net = nets.find(t);
      atNet.set(net, [...(atNet.get(net) ?? []), p.slot]);
    }
  }
  const chains = new UnionFind();
  for (const slots of atNet.values()) if (slots.length === 2) chains.union(slots[0], slots[1]);
  const groups = new Map<string, string[]>();
  for (const p of active) {
    if (p.kind !== "bulb") continue;
    const chain = chains.find(p.slot);
    groups.set(chain, [...(groups.get(chain) ?? []), p.slot]);
  }
  return [...groups.values()].filter((g) => g.length >= 2);
}

/**
 * Wires that bridge a part: connections and wire parts forming a path from
 * one terminal of a single part to its other terminal with no other part on
 * the way. Found one shortest bridge at a time until none is left.
 */
export function wireBridges(build: Build): { connections: Set<number>; slots: Set<string> } {
  const parts = placedParts(build);
  const wires = links(build, (p) => p.kind === "wire").filter((l) => l.a !== l.b);
  const bridged = new Set<string>();
  for (let guard = 0; guard <= wires.length; guard++) {
    const live = wires.filter((l) => !bridged.has(l.key));
    const bridge = parts
      .filter((p) => p.kind !== "wire")
      .map((p) => shortestPath(live, terminalA(p.slot), terminalB(p.slot)))
      .find((path) => path !== null);
    if (!bridge) break;
    for (const l of bridge) bridged.add(l.key);
  }
  const connections = new Set<number>();
  const slots = new Set<string>();
  for (const key of bridged) {
    if (key.startsWith("conn:")) connections.add(Number(key.slice(5)));
    else slots.add(key.slice(5));
  }
  return { connections, slots };
}
