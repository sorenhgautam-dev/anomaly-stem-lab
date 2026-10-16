"use client";

import type { CircuitPartKind, PropValue } from "@/engine/types";
import { TOKENS } from "@/lib/tokens";

/*
 * Circuit parts as SVG, drawn horizontally around (0, 0) with terminals at
 * x = ±60 (the board rotates vertical slots). Glows use var(--power), which
 * ramps 0 → 1 as a run plays, so the whole board powers up with one style
 * write per frame.
 */

export interface PartState {
  brightness: number;
  lit: boolean;
  burnt: boolean;
  overheat: boolean;
  current: number;
}

export const IDLE: PartState = { brightness: 0, lit: false, burnt: false, overheat: false, current: 0 };

const LEAD = "rgba(237,235,255,0.55)";
const BODY = "rgba(237,235,255,0.08)";
const EDGE = "rgba(237,235,255,0.42)";

/** Text that stays upright when the part is drawn in a vertical slot. */
function Upright({ x, y, rot, children }: { x: number; y: number; rot: number; children: React.ReactNode }) {
  return <g transform={rot ? `rotate(${-rot} ${x} ${y})` : undefined}>{children}</g>;
}

function Leads({ inner }: { inner: number }) {
  return (
    <g stroke={LEAD} strokeWidth={3} strokeLinecap="round">
      <line x1={-60} y1={0} x2={-inner} y2={0} />
      <line x1={inner} y1={0} x2={60} y2={0} />
    </g>
  );
}

function num(v: PropValue | undefined, fallback: number): number {
  return typeof v === "number" ? v : fallback;
}

export function formatOhms(ohms: number): string {
  return ohms >= 1000 ? `${ohms / 1000} kΩ` : `${ohms} Ω`;
}

function Battery({ volts, rot }: { volts: number; rot: number }) {
  return (
    <g>
      <Leads inner={44} />
      <rect x={-44} y={-17} width={88} height={34} rx={9} fill={BODY} stroke={EDGE} strokeWidth={1.5} />
      <rect x={-52} y={-8} width={8} height={16} rx={2} fill={TOKENS.signal} />
      <Upright x={-30} y={0} rot={rot}>
        <text x={-30} y={5} className="fill-signal font-mono text-[15px]" textAnchor="middle">
          +
        </text>
      </Upright>
      <Upright x={31} y={0} rot={rot}>
        <text x={31} y={5} className="fill-pearl/70 font-mono text-[15px]" textAnchor="middle">
          −
        </text>
      </Upright>
      <Upright x={0} y={0} rot={rot}>
        <text x={0} y={5} className="fill-pearl font-mono text-[13px]" textAnchor="middle">
          {volts} V
        </text>
      </Upright>
    </g>
  );
}

function Bulb({ state, id }: { state: PartState; id: string }) {
  const b = state.burnt ? 0 : state.brightness;
  const lit = b > 0.02;
  return (
    <g>
      <defs>
        <radialGradient id={`bulb-glow-${id}`}>
          <stop offset="0%" stopColor="#fff6dd" stopOpacity={0.95} />
          <stop offset="35%" stopColor={TOKENS.resolve} stopOpacity={0.55} />
          <stop offset="100%" stopColor={TOKENS.resolve} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle
        r={26 + 70 * b}
        fill={`url(#bulb-glow-${id})`}
        style={{ opacity: `calc(var(--power, 1) * ${Math.min(1, b * 1.4)})` }}
      />
      <Leads inner={24} />
      {/* The lamp symbol: a circle with a cross. It fills warm when lit. */}
      <circle r={24} fill="rgba(237,235,255,0.06)" stroke={EDGE} strokeWidth={1.5} />
      {lit && <circle r={23} fill="#fff6dd" style={{ opacity: `calc(var(--power, 1) * ${0.25 + 0.6 * b})` }} />}
      <g stroke={lit ? TOKENS.resolve : "rgba(237,235,255,0.55)"} strokeWidth={2} strokeLinecap="round">
        <line x1={-16} y1={-16} x2={16} y2={16} />
        <line x1={-16} y1={16} x2={16} y2={-16} />
      </g>
    </g>
  );
}

function Led({ state, flipped, id, rot }: { state: PartState; flipped: boolean; id: string; rot: number }) {
  const b = state.burnt ? 0 : state.brightness;
  return (
    <g>
      <defs>
        <radialGradient id={`led-glow-${id}`}>
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
          <stop offset="30%" stopColor={TOKENS.lilac} stopOpacity={0.7} />
          <stop offset="100%" stopColor={TOKENS.lilac} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle r={20 + 56 * b} fill={`url(#led-glow-${id})`} style={{ opacity: `calc(var(--power, 1) * ${Math.min(1, b * 1.3)})` }} />
      <Leads inner={18} />
      <g transform={flipped ? "scale(-1 1)" : undefined}>
        {/* Diode symbol: the triangle points from anode (+) to cathode (−). */}
        <circle r={18} fill={state.burnt ? "#14151c" : "rgba(184,166,255,0.12)"} stroke={state.burnt ? "rgba(237,235,255,0.25)" : TOKENS.lilac} strokeWidth={1.5} />
        <path d="M -7 -8 L 6 0 L -7 8 Z" fill={state.burnt ? "rgba(237,235,255,0.2)" : TOKENS.lilac} />
        <line x1={7} y1={-9} x2={7} y2={9} stroke={state.burnt ? "rgba(237,235,255,0.2)" : TOKENS.lilac} strokeWidth={2} />
        <Upright x={-38} y={-14} rot={flipped ? -rot : rot}>
          <text x={-38} y={-10} className="fill-signal font-mono text-[13px]" textAnchor="middle">
            +
          </text>
        </Upright>
        <Upright x={38} y={-14} rot={flipped ? -rot : rot}>
          <text x={38} y={-10} className="fill-pearl/60 font-mono text-[13px]" textAnchor="middle">
            −
          </text>
        </Upright>
      </g>
      {state.burnt && (
        <g>
          <path d="M -6 -16 L -1 -4 L -7 3 L 2 16" fill="none" stroke="rgba(237,235,255,0.5)" strokeWidth={1.2} />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={-6 + i * 6} cy={-24} r={6 + i * 2} className="smoke-puff" style={{ animationDelay: `${i * 0.35}s` }} />
          ))}
        </g>
      )}
    </g>
  );
}

function Resistor({ ohms, state, rot }: { ohms: number; state: PartState; rot: number }) {
  return (
    <g>
      <Leads inner={32} />
      {state.overheat && (
        <ellipse rx={58} ry={30} fill={TOKENS.resolve} style={{ opacity: "calc(var(--power, 1) * 0.28)" }} className="heat-shimmer" />
      )}
      <rect
        x={-32}
        y={-12}
        width={64}
        height={24}
        rx={7}
        fill={state.overheat ? "rgba(242,193,78,0.35)" : BODY}
        stroke={state.overheat ? TOKENS.resolve : EDGE}
        strokeWidth={1.5}
      />
      {[-18, -8, 2].map((x) => (
        <rect key={x} x={x} y={-12} width={4} height={24} fill={TOKENS.signal} opacity={0.75} />
      ))}
      <Upright x={rot ? 34 : 0} y={rot ? 0 : 34} rot={rot}>
        <text x={rot ? 34 : 0} y={rot ? 4 : 34} className="fill-pearl/80 font-mono text-[13px]" textAnchor={rot ? "start" : "middle"}>
          {formatOhms(ohms)}
        </text>
      </Upright>
    </g>
  );
}

function Switch({ closed, rot }: { closed: boolean; rot: number }) {
  return (
    <g>
      <Leads inner={30} />
      <circle cx={-30} r={5} fill={TOKENS.pearl} />
      <circle cx={30} r={5} fill={closed ? TOKENS.pearl : "rgba(237,235,255,0.5)"} />
      <line
        x1={-30}
        y1={0}
        x2={closed ? 30 : 22}
        y2={closed ? 0 : -24}
        stroke={TOKENS.pearl}
        strokeWidth={4}
        strokeLinecap="round"
        style={{ transition: "all 220ms cubic-bezier(0.2,0,0,1)" }}
      />
      <Upright x={0} y={30} rot={rot}>
        <text x={0} y={34} className="fill-pearl/70 font-mono text-[12px]" textAnchor="middle">
          {closed ? "ON" : "OFF"}
        </text>
      </Upright>
    </g>
  );
}

function WirePart() {
  return <line x1={-60} y1={0} x2={60} y2={0} stroke={TOKENS.pearl} strokeOpacity={0.7} strokeWidth={5} strokeLinecap="round" />;
}

function Motor({ state }: { state: PartState }) {
  return (
    <g>
      <Leads inner={22} />
      <circle r={22} fill={BODY} stroke={EDGE} strokeWidth={1.5} />
      <g className={state.current > 0.01 ? "motor-spin" : undefined}>
        <line x1={-14} y1={0} x2={14} y2={0} stroke={TOKENS.signal} strokeWidth={3} strokeLinecap="round" />
        <line x1={0} y1={-14} x2={0} y2={14} stroke={TOKENS.signal} strokeWidth={3} strokeLinecap="round" />
      </g>
      <text x={0} y={42} className="fill-pearl/70 font-mono text-[12px]" textAnchor="middle">
        M
      </text>
    </g>
  );
}

function Buzzer({ state }: { state: PartState }) {
  return (
    <g>
      <Leads inner={20} />
      <circle r={20} fill={BODY} stroke={EDGE} strokeWidth={1.5} />
      <circle r={5} fill={TOKENS.pearl} />
      {state.current > 0.005 &&
        [26, 34].map((r) => <circle key={r} r={r} fill="none" stroke={TOKENS.signal} strokeOpacity={0.5} className="buzz-ring" />)}
    </g>
  );
}

export function PartGlyph({
  kind,
  props,
  state,
  id,
  rot = 0,
}: {
  kind: CircuitPartKind;
  props: Record<string, PropValue>;
  state: PartState;
  id: string;
  /** The slot's rotation, so labels can stay upright. */
  rot?: number;
}) {
  switch (kind) {
    case "battery":
      return <Battery volts={num(props.volts, 6)} rot={rot} />;
    case "bulb":
      return <Bulb state={state} id={id} />;
    case "led":
      return <Led state={state} flipped={props.flipped === true} id={id} rot={rot} />;
    case "resistor":
      return <Resistor ohms={num(props.ohms, 220)} state={state} rot={rot} />;
    case "switch":
      return <Switch closed={props.closed !== false} rot={rot} />;
    case "wire":
      return <WirePart />;
    case "motor":
      return <Motor state={state} />;
    case "buzzer":
      return <Buzzer state={state} />;
  }
}

/** Small icon versions for the parts tray (same drawings, scaled). */
export function PartIcon({ kind }: { kind: CircuitPartKind }) {
  const defaults: Record<string, PropValue> = kind === "switch" ? { closed: true } : {};
  return (
    <svg viewBox="-66 -40 132 80" className="h-8 w-14" aria-hidden>
      <PartGlyph kind={kind} props={defaults} state={IDLE} id={`icon-${kind}`} />
    </svg>
  );
}

export const PART_NAMES: Record<CircuitPartKind, string> = {
  battery: "Battery",
  wire: "Wire",
  switch: "Switch",
  resistor: "Resistor",
  bulb: "Bulb",
  led: "LED",
  motor: "Motor",
  buzzer: "Buzzer",
};

/** Default props for a part dropped from the tray. */
export function defaultProps(kind: CircuitPartKind): Record<string, PropValue> {
  switch (kind) {
    case "battery":
      return { volts: 6 };
    case "resistor":
      return { ohms: 220 };
    case "bulb":
      return { ohms: 12 };
    case "led":
      return { flipped: false };
    case "switch":
      return { closed: true };
    default:
      return {};
  }
}
