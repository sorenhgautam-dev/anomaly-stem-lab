import type { Build, Connection, EditDef, ExperimentDef, PlacedPart, PropValue } from "./types";

/*
 * Builds are immutable values: every change returns a new Build. These are
 * used both by the UI (placing parts, flipping an LED) and by conflict(),
 * which tries an experiment's allowed edits.
 */

function sameWire(a: Connection, from: string, to: string): boolean {
  return (a.from === from && a.to === to) || (a.from === to && a.to === from);
}

let nextId = 0;
function partId(kind: string, slot: string): string {
  nextId += 1;
  return `${kind}-${slot}-${nextId}`;
}

/** The build an experiment starts from: fixed and initial parts, board wires, control defaults. */
export function initialBuild(def: ExperimentDef): Build {
  const parts: PlacedPart[] = [];
  for (const slot of def.board?.slots ?? []) {
    const start = slot.fixed ?? slot.initial;
    if (start) {
      parts.push({ id: `${start.kind}-${slot.id}`, kind: start.kind, slot: slot.id, props: { ...start.props } });
    }
  }
  const settings: Record<string, PropValue> = {};
  for (const control of def.controls ?? []) settings[control.id] = control.initial;
  return {
    experimentId: def.id,
    parts,
    connections: (def.board?.wires ?? []).map((w) => ({ from: w.from, to: w.to })),
    settings,
  };
}

export function partInSlot(build: Build, slot: string): PlacedPart | undefined {
  return build.parts.find((p) => p.slot === slot);
}

export function applyEdit(build: Build, edit: EditDef): Build {
  switch (edit.op) {
    case "toggle-prop":
      return {
        ...build,
        parts: build.parts.map((p) =>
          p.slot === edit.slot ? { ...p, props: { ...p.props, [edit.prop]: !p.props[edit.prop] } } : p,
        ),
      };
    case "place":
      return {
        ...build,
        parts: [
          ...build.parts.filter((p) => p.slot !== edit.slot),
          { id: partId(edit.kind, edit.slot), kind: edit.kind, slot: edit.slot, props: { ...edit.props } },
        ],
      };
    case "remove":
      return { ...build, parts: build.parts.filter((p) => p.slot !== edit.slot) };
    case "connect":
      if (build.connections.some((c) => sameWire(c, edit.from, edit.to))) return build;
      return { ...build, connections: [...build.connections, { from: edit.from, to: edit.to }] };
    case "disconnect":
      return { ...build, connections: build.connections.filter((c) => !sameWire(c, edit.from, edit.to)) };
    case "set":
      return { ...build, settings: { ...build.settings, [edit.setting]: edit.value } };
  }
}

/** True if the two builds differ in a way that changes the simulation input. */
export function sameBuild(a: Build, b: Build): boolean {
  return JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));
}

function normalise(build: Build) {
  return {
    parts: [...build.parts]
      .map((p) => ({ kind: p.kind, slot: p.slot, props: p.props }))
      .sort((x, y) => x.slot.localeCompare(y.slot)),
    connections: build.connections.map((c) => [c.from, c.to].sort().join("|")).sort(),
    settings: build.settings,
  };
}
