"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { BoardSlot, Build, CircuitPartKind, ExperimentDef, Outcome } from "@/engine/types";
import { partInSlot } from "@/engine/edits";
import { cn } from "@/lib/cn";
import { TOKENS } from "@/lib/tokens";
import { playback } from "@/components/lab/playback";
import { flowFor, polyline, slotRotation, wireShapes, type Pt } from "./board-geometry";
import { IDLE, PART_NAMES, PartGlyph, type PartState } from "./parts";

/*
 * The robotics builder (CLAUDE.md §3.5, §6.3): a board with faint outlines
 * where parts go. Parts snap into slots by click-then-click (keyboard
 * friendly) or drag and drop. After Run, current flows along the wires at a
 * speed set by the simulated amps; the ghost layer shows what the student
 * predicted beside what really happened.
 */

export const BOARD_W = 1000;
export const BOARD_H = 600;

function stateFor(outcome: Outcome | null, slot: string): PartState {
  if (!outcome) return IDLE;
  const r = outcome.readings;
  return {
    brightness: r[`${slot}.brightness`] ?? 0,
    lit: (r[`${slot}.lit`] ?? 0) > 0.5,
    burnt: (r[`${slot}.burnt`] ?? 0) > 0.5 || outcome.faults.includes(`burnout:${slot}`),
    overheat: (r[`${slot}.overheat`] ?? 0) > 0.5 || outcome.faults.includes(`overheat:${slot}`),
    current: r[`${slot}.current`] ?? 0,
  };
}

/** How long one dash takes to travel, from the current: more amps, faster flow. */
function flowDuration(amps: number): string {
  const seconds = Math.min(2.6, Math.max(0.28, 0.32 / Math.sqrt(Math.max(amps, 1e-4))));
  return `${seconds.toFixed(2)}s`;
}

interface Props {
  def: ExperimentDef;
  build: Build;
  /** Reality, once a run has started. */
  outcome: Outcome | null;
  /** The student's belief, shown after a wrong verdict. */
  ghost: Outcome | null;
  powered: boolean;
  armed: CircuitPartKind | null;
  selected: string | null;
  onPlace: (slot: string, kind: CircuitPartKind) => void;
  onSelect: (slot: string | null) => void;
  /** Registers the board so tray drags can find slots under the pointer. */
  dropTarget?: (fn: ((clientX: number, clientY: number, kind: CircuitPartKind) => boolean) | null) => void;
}

export function CircuitBoard({ def, build, outcome, ghost, powered, armed, selected, onPlace, onSelect, dropTarget }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const board = def.board!;
  const wires = wireShapes(board, build);

  // Power ramps up as the run plays: one CSS variable write per frame.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    if (!powered) {
      el.style.setProperty("--power", "0");
      return;
    }
    return playback.onFrame((t) => {
      const k = Math.min(1, t / Math.min(playback.duration, 1));
      el.style.setProperty("--power", String(k * k * (3 - 2 * k)));
    });
  }, [powered, outcome]);

  // Let the tray drop parts onto the nearest compatible empty slot.
  useEffect(() => {
    if (!dropTarget) return;
    dropTarget((clientX, clientY, kind) => {
      const el = svg.current;
      const ctm = el?.getScreenCTM();
      if (!el || !ctm) return false;
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      const target = board.slots
        .filter((s) => !s.fixed && s.accepts.includes(kind))
        .map((s) => ({ s, d: Math.hypot(s.x - p.x, s.y - p.y) }))
        .sort((a, b) => a.d - b.d)[0];
      if (!target || target.d > 110) return false;
      onPlace(target.s.id, kind);
      return true;
    });
    return () => dropTarget(null);
  }, [board, dropTarget, onPlace]);

  // Fit the view to the circuit itself, so small boards draw big and readable.
  const xs = [...board.slots.map((s) => s.x), ...wires.flatMap((w) => w.points.map((p) => p.x))];
  const ys = [...board.slots.map((s) => s.y), ...wires.flatMap((w) => w.points.map((p) => p.y))];
  const pad = 110;
  const minX = Math.max(0, Math.min(...xs) - pad);
  const minY = Math.max(0, Math.min(...ys) - pad);
  const maxX = Math.min(BOARD_W, Math.max(...xs) + pad);
  const maxY = Math.min(BOARD_H, Math.max(...ys) + pad);
  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

  const faults = outcome?.faults ?? [];
  const battery = board.slots.find((s) => s.fixed?.kind === "battery" || partInSlot(build, s.id)?.kind === "battery");

  return (
    <svg
      ref={svg}
      viewBox={viewBox}
      className="size-full select-none"
      role="group"
      aria-label={`Circuit board for ${def.title}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
    >
      <defs>
        <pattern id="board-dots" width="25" height="25" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.2" fill="rgba(237,235,255,0.09)" />
        </pattern>
        <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <rect x={minX + 8} y={minY + 8} width={maxX - minX - 16} height={maxY - minY - 16} rx={28} fill="url(#board-dots)" stroke="rgba(237,235,255,0.08)" />

      {/* Wires, then the current flowing through them. */}
      {wires.map((w) => {
        const amps = flowFor(outcome?.flows, w.connection);
        const live = powered && Math.abs(amps) > 0.0005;
        const d = polyline(w.points);
        return (
          <g key={w.key}>
            <path d={d} fill="none" stroke="rgba(237,235,255,0.22)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            {live && (
              <g style={{ opacity: "var(--power, 1)" }}>
                <path d={d} fill="none" stroke={TOKENS.signal} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" filter="url(#wire-glow)" opacity={0.55} />
                <path d={d} fill="none" stroke={TOKENS.signal} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                <path
                  d={d}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  className={amps >= 0 ? "wire-current" : "wire-current-reverse"}
                  style={{ ["--flow-duration" as string]: flowDuration(Math.abs(amps)) }}
                />
              </g>
            )}
            {w.added && <WireEnds points={w.points} />}
          </g>
        );
      })}

      {/* Slots: placed parts or faint outlines. */}
      {board.slots.map((slot) => {
        const part = partInSlot(build, slot.id);
        return (
          <Slot
            key={slot.id}
            slot={slot}
            part={part ? { kind: part.kind, props: part.props } : null}
            state={stateFor(outcome, slot.id)}
            ghost={ghost ? stateFor(ghost, slot.id) : null}
            outlines={def.outlines}
            armed={armed}
            selected={selected === slot.id}
            onPlace={onPlace}
            onSelect={onSelect}
          />
        );
      })}

      {/* Faults: sparks and a blown fuse on a short, labels for the rest. */}
      {powered && faults.includes("short-circuit") && battery && <Sparks at={{ x: battery.x, y: battery.y }} />}
      {powered && faults.length > 0 && <FaultLabel faults={faults} x={(minX + maxX) / 2} y={minY + 34} />}
      {ghost && <GhostKey x={minX + 30} y={maxY - 30} />}
    </svg>
  );
}

function WireEnds({ points }: { points: Pt[] }) {
  const ends = [points[0], points[points.length - 1]];
  return (
    <g>
      {ends.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={5} fill={TOKENS.pearl} />
      ))}
    </g>
  );
}

function Slot({
  slot,
  part,
  state,
  ghost,
  outlines,
  armed,
  selected,
  onPlace,
  onSelect,
}: {
  slot: BoardSlot;
  part: { kind: CircuitPartKind; props: Record<string, number | boolean | string> } | null;
  state: PartState;
  ghost: PartState | null;
  outlines: boolean;
  armed: CircuitPartKind | null;
  selected: boolean;
  onPlace: (slot: string, kind: CircuitPartKind) => void;
  onSelect: (slot: string | null) => void;
}) {
  const accepts = armed !== null && !slot.fixed && slot.accepts.includes(armed);
  const rotate = slotRotation(slot);
  const activate = () => {
    if (accepts && armed) onPlace(slot.id, armed);
    else onSelect(slot.id);
  };
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  };
  const label = part
    ? `${slot.label}: ${PART_NAMES[part.kind]}${accepts ? `. Press Enter to swap in the ${PART_NAMES[armed!]}` : ""}`
    : `Empty slot for ${slot.label}${accepts ? `. Press Enter to place the ${PART_NAMES[armed!]}` : ""}`;

  return (
    <g
      transform={`translate(${slot.x} ${slot.y})`}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onPointerDown={(e: ReactPointerEvent<SVGGElement>) => {
        e.stopPropagation();
        activate();
      }}
      onKeyDown={onKey}
      className="cursor-pointer outline-none [&:focus-visible>.slot-focus]:opacity-100"
    >
      <g transform={`rotate(${rotate})`}>
        {/* Hit area and focus ring. */}
        <rect x={-72} y={-40} width={144} height={80} rx={20} fill="transparent" />
        <rect className="slot-focus opacity-0" x={-72} y={-40} width={144} height={80} rx={20} fill="none" stroke={TOKENS.signal} strokeWidth={2} />
        {selected && <rect x={-72} y={-40} width={144} height={80} rx={20} fill="rgba(184,166,255,0.06)" stroke={TOKENS.lilac} strokeWidth={1.5} />}
        {part ? (
          <PartGlyph kind={part.kind} props={part.props} state={state} id={slot.id} rot={rotate} />
        ) : (
          (outlines || accepts) && (
            <g>
              <rect
                x={-56}
                y={-22}
                width={112}
                height={44}
                rx={14}
                fill={accepts ? "rgba(184,166,255,0.08)" : "transparent"}
                stroke={accepts ? TOKENS.lilac : "rgba(237,235,255,0.28)"}
                strokeWidth={1.5}
                strokeDasharray="6 6"
                className={accepts ? "animate-pulse" : undefined}
              />
            </g>
          )
        )}
        {ghost && part && <GhostMark state={ghost} real={state} kind={part.kind} rot={rotate} />}
      </g>
      {!part && (outlines || accepts) && (
        <text
          y={slot.orientation === "h" ? 5 : 5}
          className={cn("font-sans text-[15px]", accepts ? "fill-lilac" : "fill-pearl/45")}
          textAnchor="middle"
        >
          {slot.label}
        </text>
      )}
    </g>
  );
}

/** What the student's belief says happens to this part (dashed: the ghost). */
function GhostMark({ state, real, kind, rot }: { state: PartState; real: PartState; kind: CircuitPartKind; rot: number }) {
  const lightable = kind === "bulb" || kind === "led";
  const differs = lightable
    ? Math.abs(state.brightness - real.brightness) > 0.08 || state.burnt !== real.burnt
    : kind === "resistor" && state.overheat !== real.overheat;
  if (!differs) return null;
  const word = lightable ? (state.burnt ? "burnt" : state.brightness > 0.05 ? (state.brightness > 0.6 ? "bright" : "dim") : "dark") : state.overheat ? "hot" : "cool";
  const r = lightable ? 30 + 46 * state.brightness : 44;
  return (
    <g pointerEvents="none">
      <circle r={r} fill="none" stroke={TOKENS.lilac} strokeWidth={2} strokeDasharray="5 6" opacity={0.85} />
      <g transform={rot ? `rotate(${-rot})` : undefined}>
        <text y={-r - 8} className="fill-lilac font-mono text-[12px]" textAnchor="middle">
          you said: {word}
        </text>
      </g>
    </g>
  );
}

function GhostKey({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <circle r={9} fill="none" stroke={TOKENS.lilac} strokeWidth={2} strokeDasharray="4 4" />
      <text x={20} y={5} className="fill-lilac font-mono text-[13px]">
        Dashed = your prediction
      </text>
    </g>
  );
}

function Sparks({ at }: { at: Pt }) {
  return (
    <g transform={`translate(${at.x} ${at.y})`} pointerEvents="none">
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <circle
            key={i}
            cx={Math.cos(a) * 34}
            cy={Math.sin(a) * 34}
            r={4}
            fill={TOKENS.resolve}
            className="spark"
            style={{ animationDelay: `${i * 0.07}s` }}
          />
        );
      })}
    </g>
  );
}

const FAULT_TEXT: Record<string, string> = {
  "short-circuit": "Short circuit: the fuse blew",
  "open-circuit": "No complete loop: no current",
};

function FaultLabel({ faults, x, y }: { faults: string[]; x: number; y: number }) {
  const text = faults
    .map((f) => FAULT_TEXT[f] ?? (f.startsWith("burnout:") ? "LED burnt out" : f.startsWith("overheat:") ? "Resistor too hot" : null))
    .filter(Boolean)
    .join(" · ");
  if (!text) return null;
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none" style={{ opacity: "var(--power, 1)" }}>
      <rect x={-200} y={-18} width={400} height={34} rx={17} fill="rgba(5,6,10,0.75)" stroke="rgba(242,193,78,0.6)" />
      <text y={5} className="fill-resolve font-sans text-[14px]" textAnchor="middle">
        {text}
      </text>
    </g>
  );
}
