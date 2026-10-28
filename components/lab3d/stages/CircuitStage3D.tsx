"use client";

import { useEffect, useMemo } from "react";
import { Vector3 } from "three";
import { initialBuild, partInSlot } from "@/engine/edits";
import type { CircuitPartKind, ExperimentDef, Prediction, PropValue } from "@/engine/types";
import { useLab } from "@/lib/store";
import { PART_NAMES } from "@/components/lab/BuildControls";
import { flowFor, wireShapes } from "../kit/circuit/board-geometry";
import { Board3D } from "../kit/circuit/Board3D";
import { ghostIdea } from "../kit/circuit/lamps3d";
import { PartModel, partState, type PartState } from "../kit/circuit/PartModel";
import { Slot3D } from "../kit/circuit/Slot3D";
import { BOARD_SCALE, slotFrame } from "../kit/circuit/space";
import { Tray3D } from "../kit/circuit/Tray3D";
import { Wire3D } from "../kit/circuit/Wire3D";
import { labView, setAnchor } from "../lab-state";
import { predictionWords } from "../scene/PredictionGhost";
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

/**
 * The student's prediction as a lamp, drawn as its ghost after a wrong run
 * when no misconception's model gives one: a picture of their choice ("Glow",
 * "Burn out", "Yes" to "will it light?"), never a simulation. Answers that
 * don't name a lamp state draw no ghost.
 */
function lampFromPrediction(def: ExperimentDef, p: Prediction | null): PartState | null {
  if (p?.type !== "choice" || def.prediction.type !== "choice") return null;
  const v = p.value.toLowerCase();
  const asksLight = /light/.test(def.prediction.question.toLowerCase());
  if (/burn/.test(v)) return { brightness: 0, burnt: true, current: 0 };
  if (/glow/.test(v) || (v === "yes" && asksLight)) return { brightness: 1, burnt: false, current: 0 };
  if (/dark|go out/.test(v) || (v === "no" && asksLight)) return { brightness: 0, burnt: false, current: 0 };
  return null;
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
  // A lamp on an upright slot has its legs one behind the other from the front: the reveal turns to see them side by side.
  const upright = lamp ? Math.abs(Math.sin(slotFrame(lamp).yaw)) > 0.7 : false;
  const shots = benchShots(cx, cz + 0.25, (b.maxX - b.minX) * BOARD_SCALE * 1.14, focus ? [focus.x, 0.25, focus.z] : undefined, upright ? 28 : 6);
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
  const prediction = useLab((s) => s.prediction);
  const lamp = useMemo(() => lampSlot(def)?.id ?? null, [def]);
  // The ghost a part shows after a wrong run: the matched misconception's outcome, or else, on the lamp, the prediction itself.
  const ghostFor = (slotId: string): PartState | null => (ghost ? partState(ghost, slotId) : phase === "result" && result?.verdict === "wrong" && slotId === lamp ? lampFromPrediction(def, prediction) : null);
  // The idea the lamp's inspect label carries after a run that wasn't right: the ghost's own words, or the prediction itself.
  const ideaFor = (slotId: string, kind: CircuitPartKind) => {
    if (phase === "build" || result?.verdict === "correct") return null;
    const g = kind === "led" || kind === "bulb" ? ghostFor(slotId) : null;
    const own = g ? ghostIdea(g, partState(outcome, slotId)) : null;
    if (own) return own;
    return slotId === lamp && prediction ? `Your idea: ${predictionWords(def, prediction)}` : null;
  };

  // The prediction ghost and the verdict burst sit over the lamp (or the board's middle).
  useEffect(() => {
    const lamp = lampSlot(def);
    const b = bounds(def);
    setAnchor("focus", lamp ? slotFrame(lamp).centre.clone().setY(0.12) : new Vector3(((b.minX + b.maxX) / 2 - 500) * BOARD_SCALE, 0.12, ((b.minY + b.maxY) / 2 - 300) * BOARD_SCALE));
    // Ano points the lamp out from above its label, against the back wall: beside it, the ghost and the board leave no room.
    if (lamp) setAnchor("ano", slotFrame(lamp).centre.clone().add(new Vector3(0, 1.0, -0.15)));
    return () => void labView.anchors.delete("ano");
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
        // A selected lamp's inspect label carries the student's idea; its ghost then drops its own label.
        const idea = part && selected === slot.id ? ideaFor(slot.id, part.kind) : null;
        const activate = () => {
          if (accepts) return place(slot.id);
          if (phase === "build" && part?.kind === "switch" && !slot.fixed) edit({ op: "toggle-prop", slot: slot.id, prop: "closed" });
          select(slot.id);
        };
        return (
          <Slot3D key={slot.id} slot={slot} occupied={!!part} accepts={accepts} selected={selected === slot.id} showOutline={def.outlines} partKey={part?.id ?? null} flyIn={!!part && !initial.has(part.id)} inspect={part ? describe(part.kind, part.props) : null} idea={idea} onActivate={activate}>
            {part && <PartModel kind={part.kind} props={part.props} half={slotFrame(slot).half} state={partState(outcome, slot.id)} ghost={ghostFor(slot.id)} ghostLabel={!idea} powered={powered} />}
          </Slot3D>
        );
      })}
      {def.parts.length > 0 && <Tray3D parts={def.parts} armed={armed} disabled={phase !== "build"} onArm={arm} />}
    </group>
  );
}
