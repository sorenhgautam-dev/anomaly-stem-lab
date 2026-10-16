"use client";

import { useRef } from "react";
import { TOKENS } from "@/lib/tokens";
import type { StageProps } from "@/components/lab/stages";
import { sample } from "@/components/lab/playback";
import { Beaker, Bench, Bubbles, Thermometer, type BubblesHandle, type ValueHandle } from "../bench";
import { useStageFrames } from "../useStageFrames";

/*
 * Stage "rate" — Reaction speed and temperature. Two identical fizzy tablets
 * drop into cold and hot water at the same moment. Each tablet shrinks as it
 * reacts; a clock counts real seconds (the run is a time-lapse). After a
 * wrong verdict, dashed outlines show where the student's belief says each
 * tablet would be. Keys: engine/chemistry/rate.ts.
 */

const SIDES = [
  { key: "cold", x: 250, label: "Cold water" },
  { key: "hot", x: 560, label: "Hot water" },
] as const;

export function RaceStage({ def, build, outcome, ghost }: StageProps) {
  const thermos = useRef<(ValueHandle | null)[]>([]);
  const tablets = useRef<(SVGRectElement | null)[]>([]);
  const ghosts = useRef<(SVGRectElement | null)[]>([]);
  const fizz = useRef<(BubblesHandle | null)[]>([]);
  const done = useRef<(SVGTextElement | null)[]>([]);
  const clock = useRef<SVGTextElement>(null);
  const temps = {
    cold: typeof build.settings.cold === "number" ? build.settings.cold : 10,
    hot: typeof build.settings.hot === "number" ? build.settings.hot : 60,
  };

  useStageFrames(def, build, outcome, (t, v) => {
    const g = ghost ? sample(ghost.timeline, t) : null;
    SIDES.forEach((side, i) => {
      thermos.current[i]?.set(temps[side.key]);
      const left = outcome ? (v[`${side.key}.remaining`] ?? 1) : 1;
      const size = 44 * Math.cbrt(Math.max(0, left));
      const tab = tablets.current[i];
      tab?.setAttribute("width", String(size));
      tab?.setAttribute("height", String(size * 0.45));
      tab?.setAttribute("x", String(side.x - size / 2));
      tab?.setAttribute("opacity", left > 0.01 ? "0.95" : "0");
      fizz.current[i]?.set(outcome ? (v[`${side.key}.bubbles`] ?? 0) : 0, t);
      const finished = outcome && left <= 0.01;
      if (done.current[i]) done.current[i]!.style.opacity = finished ? "1" : "0";
      const ghostTab = ghosts.current[i];
      if (ghostTab) {
        const gl = g ? (g[`${side.key}.remaining`] ?? 1) : 0;
        const gs = 44 * Math.cbrt(Math.max(0, gl));
        ghostTab.style.display = g && gl > 0.01 ? "" : "none";
        ghostTab.setAttribute("width", String(gs));
        ghostTab.setAttribute("height", String(gs * 0.45));
        ghostTab.setAttribute("x", String(side.x - gs / 2));
      }
    });
    if (clock.current) clock.current.textContent = `${Math.round(v.clock ?? 0)} s`;
  });

  return (
    <svg viewBox="0 0 1000 600" className="size-full" role="img" aria-label={`${def.title}: two tablets, one in cold water and one in hot water`}>
      <Bench y={500} />
      {SIDES.map((side, i) => (
        <g key={side.key}>
          <Beaker x={side.x} y={260} w={170} h={230} level={0.72} color={side.key === "hot" ? "rgba(255,59,92,0.12)" : "rgba(61,123,255,0.2)"}>
            <Bubbles
              ref={(el) => {
                fizz.current[i] = el;
              }}
              x={side.x - 60}
              y={330}
              w={120}
              h={140}
            />
            <rect
              ref={(el) => {
                tablets.current[i] = el;
              }}
              x={side.x - 22}
              y={466}
              width={44}
              height={20}
              rx={6}
              fill={TOKENS.pearl}
            />
            <rect
              ref={(el) => {
                ghosts.current[i] = el;
              }}
              x={side.x - 22}
              y={466}
              width={44}
              height={20}
              rx={6}
              fill="none"
              stroke={TOKENS.lilac}
              strokeDasharray="4 4"
              style={{ display: "none" }}
            />
          </Beaker>
          <Thermometer
            ref={(el) => {
              thermos.current[i] = el;
            }}
            x={side.x + 118}
            y={250}
            height={230}
            min={0}
            max={100}
          />
          <text x={side.x} y={540} textAnchor="middle" className="fill-pearl/70 text-[15px]">
            {side.label}
          </text>
          <text
            ref={(el) => {
              done.current[i] = el;
            }}
            x={side.x}
            y={238}
            textAnchor="middle"
            className="fill-resolve font-mono text-[14px]"
            style={{ opacity: 0, transition: "opacity 300ms" }}
          >
            done
          </text>
        </g>
      ))}
      <g transform="translate(850 140)">
        <circle r={56} fill="rgba(237,235,255,0.04)" stroke="rgba(237,235,255,0.3)" />
        <text ref={clock} y={7} textAnchor="middle" className="fill-pearl font-mono text-[20px]">
          0 s
        </text>
        <text y={82} textAnchor="middle" className="fill-pearl/50 text-[12px]">
          real time (sped up)
        </text>
      </g>
      {ghost && (
        <text x={405} y={80} textAnchor="middle" className="fill-lilac font-mono text-[13px]">
          dashed = where your idea says each tablet would be
        </text>
      )}
    </svg>
  );
}
