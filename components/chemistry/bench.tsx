"use client";

import { useImperativeHandle, useRef, type ReactNode, type Ref } from "react";
import { TOKENS } from "@/lib/tokens";

/*
 * Chemistry bench parts in SVG. Each part takes a `ref` with a tiny
 * imperative API (`set…`) so stages can animate them from the playback
 * clock by writing attributes directly: no React renders per frame.
 *
 * Glass is a pearl outline with a soft highlight; liquids are light tints;
 * instruments use the mono face because they are real readouts.
 */

export const GLASS = "rgba(237,235,255,0.55)";
export const GLASS_FILL = "rgba(237,235,255,0.04)";
export const WATER = "rgba(61,123,255,0.20)";

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

/** The bench surface everything stands on. */
export function Bench({ y, x1 = 40, x2 = 960 }: { y: number; x1?: number; x2?: number }) {
  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="rgba(237,235,255,0.18)" strokeWidth={1.5} />
      <rect x={x1} y={y} width={x2 - x1} height={26} fill="url(#bench-fade)" />
      <defs>
        <linearGradient id="bench-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(237,235,255,0.05)" />
          <stop offset="100%" stopColor="rgba(237,235,255,0)" />
        </linearGradient>
      </defs>
    </g>
  );
}

export interface ValueHandle {
  set: (value: number) => void;
}

/** A digital scale. The display shows grams to two decimals. */
export function Scale({
  x,
  y,
  width = 260,
  label = "g",
  decimals = 2,
  ref,
}: {
  x: number;
  y: number;
  width?: number;
  label?: string;
  decimals?: number;
  ref?: Ref<ValueHandle>;
}) {
  const text = useRef<SVGTextElement>(null);
  useImperativeHandle(ref, () => ({
    set(value: number) {
      if (text.current) text.current.textContent = `${value.toFixed(decimals)} ${label}`;
    },
  }));
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-width / 2} y={0} width={width} height={14} rx={7} fill="rgba(237,235,255,0.18)" />
      <rect x={-width / 2 + 20} y={14} width={width - 40} height={56} rx={14} fill="rgba(237,235,255,0.06)" stroke="rgba(237,235,255,0.2)" />
      <rect x={-78} y={26} width={156} height={34} rx={8} fill="#0b0d14" stroke="rgba(61,123,255,0.45)" />
      <text ref={text} x={0} y={50} textAnchor="middle" className="fill-pearl font-mono text-[17px]">
        —
      </text>
    </g>
  );
}

/** A thermometer: the column rises with temperature; the readout sits beside it. */
export function Thermometer({
  x,
  y,
  height = 240,
  min = -20,
  max = 100,
  ref,
}: {
  x: number;
  y: number;
  height?: number;
  min?: number;
  max?: number;
  ref?: Ref<ValueHandle>;
}) {
  const column = useRef<SVGRectElement>(null);
  const text = useRef<SVGTextElement>(null);
  useImperativeHandle(ref, () => ({
    set(celsius: number) {
      const k = clamp01((celsius - min) / (max - min));
      const h = 12 + k * (height - 40);
      if (column.current) {
        column.current.setAttribute("y", String(height - 18 - h));
        column.current.setAttribute("height", String(h));
      }
      if (text.current) text.current.textContent = `${celsius.toFixed(1)} °C`;
    },
  }));
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-9} y={0} width={18} height={height - 10} rx={9} fill={GLASS_FILL} stroke={GLASS} />
      <circle cx={0} cy={height - 10} r={15} fill={TOKENS.anomaly} fillOpacity={0.85} stroke={GLASS} />
      <rect ref={column} x={-4} y={height - 30} width={8} height={12} rx={4} fill={TOKENS.anomaly} fillOpacity={0.85} />
      {ticks.map((k) => {
        const ty = height - 30 - k * (height - 40);
        return (
          <g key={k}>
            <line x1={10} y1={ty} x2={18} y2={ty} stroke="rgba(237,235,255,0.4)" />
            <text x={22} y={ty + 4} className="fill-pearl/45 font-mono text-[11px]">
              {Math.round(min + k * (max - min))}
            </text>
          </g>
        );
      })}
      <text ref={text} x={0} y={-14} textAnchor="middle" className="fill-pearl font-mono text-[15px]">
        —
      </text>
    </g>
  );
}

/** A dial gauge with a needle, e.g. pressure in kPa. */
export function Gauge({
  x,
  y,
  r = 70,
  min = 0,
  max = 100,
  unit = "",
  label,
  ref,
}: {
  x: number;
  y: number;
  r?: number;
  min?: number;
  max?: number;
  unit?: string;
  label: string;
  ref?: Ref<ValueHandle & { ghost: (value: number | null) => void }>;
}) {
  const needle = useRef<SVGLineElement>(null);
  const ghostNeedle = useRef<SVGLineElement>(null);
  const text = useRef<SVGTextElement>(null);
  const angle = (v: number) => -120 + clamp01((v - min) / (max - min)) * 240;
  useImperativeHandle(ref, () => ({
    set(value: number) {
      needle.current?.setAttribute("transform", `rotate(${angle(value)})`);
      if (text.current) text.current.textContent = `${value.toFixed(0)} ${unit}`;
    },
    ghost(value: number | null) {
      if (!ghostNeedle.current) return;
      ghostNeedle.current.style.display = value === null ? "none" : "";
      if (value !== null) ghostNeedle.current.setAttribute("transform", `rotate(${angle(value)})`);
    },
  }));
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="rgba(237,235,255,0.04)" stroke="rgba(237,235,255,0.3)" />
      {Array.from({ length: 9 }, (_, i) => {
        const a = ((-120 + i * 30) * Math.PI) / 180;
        return (
          <line key={i} x1={Math.sin(a) * (r - 6)} y1={-Math.cos(a) * (r - 6)} x2={Math.sin(a) * (r - 16)} y2={-Math.cos(a) * (r - 16)} stroke="rgba(237,235,255,0.45)" />
        );
      })}
      <line ref={ghostNeedle} x1={0} y1={0} x2={0} y2={-(r - 18)} stroke={TOKENS.lilac} strokeWidth={3} strokeDasharray="5 5" style={{ display: "none" }} />
      <line ref={needle} x1={0} y1={0} x2={0} y2={-(r - 14)} stroke={TOKENS.signal} strokeWidth={4} strokeLinecap="round" />
      <circle r={6} fill={TOKENS.pearl} />
      <text ref={text} y={r * 0.55} textAnchor="middle" className="fill-pearl font-mono text-[15px]">
        —
      </text>
      <text y={r + 22} textAnchor="middle" className="fill-pearl/55 text-[13px]">
        {label}
      </text>
    </g>
  );
}

export interface LiquidHandle {
  level: (fraction: number) => void;
  color: (css: string) => void;
}

/** A beaker. The liquid level (0..1 of its height) and colour can change. */
export function Beaker({
  x,
  y,
  w = 160,
  h = 190,
  level = 0.5,
  color = WATER,
  children,
  ref,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  level?: number;
  color?: string;
  children?: ReactNode;
  ref?: Ref<LiquidHandle>;
}) {
  const liquid = useRef<SVGRectElement>(null);
  const surface = useRef<SVGLineElement>(null);
  const id = `beaker-${Math.round(x)}-${Math.round(y)}`;
  const set = (f: number) => {
    const top = y + h - clamp01(f) * (h - 16);
    liquid.current?.setAttribute("y", String(top));
    liquid.current?.setAttribute("height", String(y + h - top));
    surface.current?.setAttribute("y1", String(top));
    surface.current?.setAttribute("y2", String(top));
  };
  useImperativeHandle(ref, () => ({
    level: set,
    color(css: string) {
      liquid.current?.setAttribute("fill", css);
    },
  }));
  const top = y + h - clamp01(level) * (h - 16);
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <rect x={x - w / 2 + 3} y={y} width={w - 6} height={h - 3} rx={14} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect ref={liquid} x={x - w / 2} y={top} width={w} height={y + h - top} fill={color} />
        <line ref={surface} x1={x - w / 2} y1={top} x2={x + w / 2} y2={top} stroke="rgba(237,235,255,0.35)" />
        {children}
      </g>
      <path
        d={`M ${x - w / 2 - 6} ${y} L ${x - w / 2} ${y + 6} L ${x - w / 2} ${y + h - 14} Q ${x - w / 2} ${y + h} ${x - w / 2 + 14} ${y + h} L ${x + w / 2 - 14} ${y + h} Q ${x + w / 2} ${y + h} ${x + w / 2} ${y + h - 14} L ${x + w / 2} ${y}`}
        fill={GLASS_FILL}
        stroke={GLASS}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <line x1={x - w / 2 + 12} y1={y + 18} x2={x - w / 2 + 12} y2={y + h - 22} stroke="rgba(237,235,255,0.22)" strokeWidth={4} strokeLinecap="round" />
    </g>
  );
}

export interface BagHandle {
  inflate: (fraction: number) => void;
}

/** A zip bag that swells with gas (0 = flat, 1 = full). */
export function ZipBag({ x, y, w = 240, h = 170, children, ref }: { x: number; y: number; w?: number; h?: number; children?: ReactNode; ref?: Ref<BagHandle> }) {
  const body = useRef<SVGPathElement>(null);
  const shape = (f: number) => {
    const bulge = 6 + clamp01(f) * 46;
    const top = y + 18 - clamp01(f) * 24;
    return `M ${x - w / 2} ${y + h} Q ${x - w / 2 - bulge} ${y + h / 2} ${x - w / 2 + 6} ${top} L ${x + w / 2 - 6} ${top} Q ${x + w / 2 + bulge} ${y + h / 2} ${x + w / 2} ${y + h} Z`;
  };
  useImperativeHandle(ref, () => ({
    inflate(f: number) {
      body.current?.setAttribute("d", shape(f));
    },
  }));
  return (
    <g>
      <path ref={body} d={shape(0)} fill="rgba(237,235,255,0.05)" stroke={GLASS} strokeWidth={2} strokeLinejoin="round" />
      {children}
    </g>
  );
}

/** A zip seal line drawn across the top of the bag (shown when sealed). */
export function ZipSeal({ x, y, w, sealed }: { x: number; y: number; w: number; sealed: boolean }) {
  return (
    <g>
      <line x1={x - w / 2 + 8} y1={y} x2={x + w / 2 - 8} y2={y} stroke={sealed ? TOKENS.signal : "rgba(237,235,255,0.3)"} strokeWidth={sealed ? 5 : 2} strokeDasharray={sealed ? undefined : "8 8"} strokeLinecap="round" />
      <text x={x + w / 2 + 12} y={y + 5} className={sealed ? "fill-signal text-[13px]" : "fill-pearl/50 text-[13px]"}>
        {sealed ? "Sealed" : "Open"}
      </text>
    </g>
  );
}

export interface BubblesHandle {
  set: (intensity: number, t: number) => void;
}

/** Rising bubbles inside a box; intensity 0..1 sets how many show. */
export function Bubbles({
  x,
  y,
  w,
  h,
  count = 26,
  color = "rgba(237,235,255,0.7)",
  ref,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  count?: number;
  color?: string;
  ref?: Ref<BubblesHandle>;
}) {
  const group = useRef<SVGGElement>(null);
  useImperativeHandle(ref, () => ({
    set(intensity: number, t: number) {
      const g = group.current;
      if (!g) return;
      const shown = Math.round(clamp01(intensity) * count);
      Array.from(g.children).forEach((c, i) => {
        const el = c as SVGCircleElement;
        if (i >= shown) {
          el.setAttribute("opacity", "0");
          return;
        }
        const speed = 0.35 + ((i * 37) % 10) / 14;
        const phase = ((i * 0.618) % 1) + t * speed;
        const k = phase % 1;
        el.setAttribute("cx", String(x + ((i * 53) % 97) / 97 * w + Math.sin(t * 3 + i) * 4));
        el.setAttribute("cy", String(y + h - k * h));
        el.setAttribute("opacity", String(0.85 * (1 - k)));
      });
    },
  }));
  return (
    <g ref={group} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} r={2 + (i % 3)} fill="none" stroke={color} strokeWidth={1.2} opacity={0} />
      ))}
    </g>
  );
}

/** A small label with a leader line, for parts of the setup. */
export function Callout({ x, y, text, dx = 0, dy = -40 }: { x: number; y: number; text: string; dx?: number; dy?: number }) {
  return (
    <g pointerEvents="none">
      <line x1={x} y1={y} x2={x + dx} y2={y + dy + 6} stroke="rgba(237,235,255,0.3)" />
      <text x={x + dx} y={y + dy} textAnchor="middle" className="fill-pearl/60 text-[13px]">
        {text}
      </text>
    </g>
  );
}

/** Dashed lilac readout for what the student's belief predicted. */
export function GhostReadout({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <rect x={-96} y={-18} width={192} height={32} rx={10} fill="rgba(184,166,255,0.08)" stroke={TOKENS.lilac} strokeDasharray="5 5" />
      <text y={4} textAnchor="middle" className="fill-lilac font-mono text-[13px]">
        {text}
      </text>
    </g>
  );
}
