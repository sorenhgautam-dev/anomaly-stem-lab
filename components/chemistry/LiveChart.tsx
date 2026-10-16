"use client";

import { useImperativeHandle, useMemo, useRef, type Ref } from "react";
import type { TimelineFrame } from "@/engine/types";
import { TOKENS } from "@/lib/tokens";

/*
 * A small line chart that draws itself as the run plays: one timeline value
 * against time (or against another value). After a wrong verdict the
 * student's belief is drawn dashed in lilac beside it.
 */

export interface ChartHandle {
  set: (t: number) => void;
}

interface Props {
  x: number;
  y: number;
  w: number;
  h: number;
  timeline: TimelineFrame[] | undefined;
  ghost?: TimelineFrame[] | undefined;
  yKey: string;
  /** Plot against this value instead of time (e.g. base added). */
  xKey?: string;
  yMin: number;
  yMax: number;
  xMin?: number;
  xMax?: number;
  xLabel: string;
  yLabel: string;
  yTicks?: number[];
  ref?: Ref<ChartHandle>;
}

function pathFor(frames: TimelineFrame[], xOf: (f: TimelineFrame) => number, yOf: (f: TimelineFrame) => number): string {
  return frames.map((f, i) => `${i === 0 ? "M" : "L"} ${xOf(f).toFixed(1)} ${yOf(f).toFixed(1)}`).join(" ");
}

export function LiveChart({ x, y, w, h, timeline, ghost, yKey, xKey, yMin, yMax, xMin, xMax, xLabel, yLabel, yTicks = [], ref }: Props) {
  const real = useRef<SVGPathElement>(null);
  const belief = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const frames = useMemo(() => timeline ?? [], [timeline]);
  const xs = xKey ? frames.map((f) => f.values[xKey] ?? 0) : frames.map((f) => f.t);
  const x0 = xMin ?? Math.min(0, ...xs);
  const x1 = xMax ?? Math.max(1e-6, ...xs);
  const sx = (v: number) => x + ((v - x0) / (x1 - x0 || 1)) * w;
  const sy = (v: number) => y + h - ((Math.min(yMax, Math.max(yMin, v)) - yMin) / (yMax - yMin)) * h;
  const xOf = (f: TimelineFrame) => sx(xKey ? (f.values[xKey] ?? 0) : f.t);
  const yOf = (f: TimelineFrame) => sy(f.values[yKey] ?? 0);

  useImperativeHandle(ref, () => ({
    set(t: number) {
      const shown = frames.filter((f) => f.t <= t + 1e-6);
      real.current?.setAttribute("d", shown.length > 1 ? pathFor(shown, xOf, yOf) : "");
      const last = shown[shown.length - 1];
      if (dot.current) {
        dot.current.style.display = last ? "" : "none";
        if (last) {
          dot.current.setAttribute("cx", String(xOf(last)));
          dot.current.setAttribute("cy", String(yOf(last)));
        }
      }
      if (belief.current) {
        const g = (ghost ?? []).filter((f) => f.t <= t + 1e-6);
        belief.current.setAttribute("d", g.length > 1 ? pathFor(g, xOf, yOf) : "");
      }
    },
  }));

  return (
    <g>
      <rect x={x - 14} y={y - 14} width={w + 28} height={h + 52} rx={16} fill="rgba(237,235,255,0.03)" stroke="rgba(237,235,255,0.1)" />
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={x} y1={sy(v)} x2={x + w} y2={sy(v)} stroke="rgba(237,235,255,0.08)" />
          <text x={x - 6} y={sy(v) + 4} textAnchor="end" className="fill-pearl/45 font-mono text-[11px]">
            {v}
          </text>
        </g>
      ))}
      <line x1={x} y1={y + h} x2={x + w} y2={y + h} stroke="rgba(237,235,255,0.3)" />
      <line x1={x} y1={y} x2={x} y2={y + h} stroke="rgba(237,235,255,0.3)" />
      <text x={x + w} y={y + h + 24} textAnchor="end" className="fill-pearl/55 text-[12px]">
        {xLabel}
      </text>
      <text x={x} y={y - 22} className="fill-pearl/55 text-[12px]">
        {yLabel}
      </text>
      <path ref={belief} fill="none" stroke={TOKENS.lilac} strokeWidth={2} strokeDasharray="6 6" />
      <path ref={real} fill="none" stroke={TOKENS.signal} strokeWidth={2.5} strokeLinejoin="round" />
      <circle ref={dot} r={5} fill={TOKENS.signal} style={{ display: "none" }} />
    </g>
  );
}
