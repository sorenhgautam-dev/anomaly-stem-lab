"use client";

import { useEffect, useMemo } from "react";
import { Vector3 } from "three";
import { initialBuild, partInSlot } from "@/engine/edits";
import type { CircuitPartKind, ExperimentDef, PropValue } from "@/engine/types";
import { useLab } from "@/lib/store";
import { PART_NAMES } from "@/components/lab/BuildControls";
import { flowFor, wireShapes } from "../kit/circuit/board-geometry";
import { Board3D } from "../kit/circuit/Board3D";
import { PartModel, partState } from "../kit/circuit/PartModel";
import { Slot3D } from "../kit/circuit/Slot3D";
import { BOARD_SCALE, slotFrame } from "../kit/circuit/space";
import { Tray3D } from "../kit/circuit/Tray3D";
import { Wire3D } from "../kit/circuit/Wire3D";
import { setAnchor } from "../lab-state";
import { benchShots, orbit, type StageShots } from "../shots";

/*
 * Every circuit experiment in 3D (Light the LED, bulbs, switches, series and
 * parallel, the shortcut wire, Ohm's law): the board on the bench, wires with
 * current flowing at the simulator's amps, parts in glowing outlines, the
 * tray in front. Reality comes from the run's outcome; after a wrong run the
 * ghost of the prediction glows beside it.
 */

/** What a part is, for its inspect label: "Resistor · 220 Ω". */
function describe(kind: CircuitPartKind, props: Record<string, PropValue>): string {
  const name = PART_NAMES[kind];
  if (kind === "battery") return `${name} · ${props.volts} V`;
  if (kind === "resistor") return `${name} · ${props.ohms} Ω`;
  if (kind === "led") return `${name} · ${props.flipped ? "backwards" : "forwards"}`;
  if (kind === "switch") return `${name} · ${props.closed ? "closed" : "open"}`;
  return name;
}

/** The slot holding the lamp (LED or bulb) that shows the result, if any. */
function lampSlot(def: ExperimentDef) {
  const lamp = (k?: string) => k === "led" || k === "bulb";
  return def.board!.slots.find((s) => s.accepts.some(lamp) || lamp(s.initial?.kind) || lamp(s.fixed?.kind));
}

function bounds(def: ExperimentDef) {
  const board = def.board!;
  const xs = [...board.slots.map((s) => s.x), ...board.wires.flatMap((w) => (w.via ?? []).map(([x]) => x))];
  const ys = [...board.slots.map((s) => s.y), ...board.wires.flatMap((w) => (w.via ?? []).map(([, y]) => y))];
  const pad = 90;
  return { minX: Math.min(...xs) - pad, maxX: Math.max(...xs) + pad, minY: Math.min(...ys) - pad, maxY: Math.max(...ys) + pad };
}

export function circuitShots(def: ExperimentDef): StageShots {
  const b = bounds(def);
  const cx = ((b.minX + b.maxX) / 2 - 500) * BOARD_SCALE;
  const cz = ((b.minY + b.maxY) / 2 - 300) * BOARD_SCALE;
  const lamp = lampSlot(def);
  const focus = lamp ? slotFrame(lamp).centre : null;
  // Framed a little wider than the board, so the lamp at its end stays clear of the inspector.
  const shots = benchShots(cx, cz + 0.25, (b.maxX - b.minX) * BOARD_SCALE * 1.14, focus ? [focus.x, 0.25, focus.z] : undefined);
  // "Zoom in on the current": down close to the lamp to watch the charge flow through its leads.
  shots.particles = orbit(focus ? [focus.x, 0.1, focus.z] : [cx, 0.1, cz], 1.9, 32, -25);
  return shots;
}

export function CircuitStage3D() {
  const def = useLab((s) => s.def)!;
  const build = useLab((s) => s.build)!;
  const phase = useLab((s) => s.phase);
  const result = useLab((s) => s.result);
  const selected = useLab((s) => s.selected);
  const armed = useLab((s) => s.armed);
  const select = useLab((s) => s.select);
  const place = useLab((s) => s.place);
  const arm = useLab((s) => s.arm);
  const edit = useLab((s) => s.edit);
  const board = def.board!;
  const initial = useMemo(() => new Set(initialBuild(def).parts.map((p) => p.id)), [def]);
  const wires = useMemo(() => wireShapes(board, build), [board, build]);
  const box = useMemo(() => bounds(def), [def]);
  const outcome = phase === "build" ? null : (result?.outcome ?? null);
  const ghost = phase === "result" && result?.verdict === "wrong" ? (result.diagnosis?.ghost ?? null) : null;
  const powered = phase !== "build";

  // The prediction ghost and the verdict burst sit over the lamp (or the board's middle).
  useEffect(() => {
    const lamp = lampSlot(def);
    const b = bounds(def);
    setAnchor("focus", lamp ? slotFrame(lamp).centre.clone().setY(0.12) : new Vector3(((b.minX + b.maxX) / 2 - 500) * BOARD_SCALE, 0.12, ((b.minY + b.maxY) / 2 - 300) * BOARD_SCALE));
  }, [def]);

  return (
    <group>
      <Board3D {...box} />
      {wires.map((w) => (
        <Wire3D key={w.key} points={w.points} added={w.added} amps={flowFor(outcome?.flows, w.connection)} powered={powered} />
      ))}
      {board.slots.map((slot) => {
        const part = partInSlot(build, slot.id);
        const accepts = phase === "build" && !!armed && !slot.fixed && slot.accepts.includes(armed);
        const activate = () => {
          if (accepts) return place(slot.id);
          if (phase === "build" && part?.kind === "switch" && !slot.fixed) edit({ op: "toggle-prop", slot: slot.id, prop: "closed" });
          select(slot.id);
        };
        return (
          <Slot3D key={slot.id} slot={slot} occupied={!!part} accepts={accepts} selected={selected === slot.id} showOutline={def.outlines} partKey={part?.id ?? null} flyIn={!!part && !initial.has(part.id)} inspect={part ? describe(part.kind, part.props) : null} onActivate={activate}>
            {part && <PartModel kind={part.kind} props={part.props} half={slotFrame(slot).half} state={partState(outcome, slot.id)} ghost={ghost ? partState(ghost, slot.id) : null} powered={powered} />}
          </Slot3D>
        );
      })}
      {def.parts.length > 0 && <Tray3D parts={def.parts} armed={armed} disabled={phase !== "build"} onArm={arm} />}
    </group>
  );
}
