"use client";

import { useEffect, useRef, type Ref } from "react";
import { MOTOR_RPM } from "@/engine/robotics/gears";
import { numberSetting } from "@/engine/robotics/settings";
import type { Outcome } from "@/engine/types";
import { TOKENS } from "@/lib/tokens";
import { playback } from "@/components/lab/playback";
import type { StageProps } from "@/components/lab/stages";

/*
 * Gears stage: a motor gear meshed with an output gear, each drawn with as
 * many teeth as its slider says (size ∝ teeth, same tooth size, so they
 * mesh). During a run both turn from the timeline's driverAngle and
 * drivenAngle; a speed gauge measures the output. The output's rpm stays a
 * "?" until the run is over. After a wrong verdict a dashed lilac needle
 * shows the speed the student's belief predicted, beside the real needle.
 * Before a run nothing turns, so the drawing never gives the answer away.
 */

const VIEW_W = 1200;
const VIEW_H = 500;
/** Pitch radius = MODULE × teeth / 2 (SVG units). */
const MODULE = 8.5;
const ADDENDUM = MODULE;
const DEDENDUM = MODULE * 1.25;
const GEAR_AREA_CX = 420;
const GEAR_CY = 212;
const GAUGE = { cx: 1012, cy: 318, r: 140, max: 300 };
/** The output needle settles over this long at the start of a run. */
const SETTLE_SECONDS = 0.6;

const pitchRadius = (teeth: number) => (MODULE * teeth) / 2;

/** A gear outline with `teeth` trapezoid teeth, tooth 0 centred on the +x axis. */
function gearPath(teeth: number): string {
  const r = pitchRadius(teeth);
  const tip = r + ADDENDUM;
  const root = r - DEDENDUM;
  const pitch = (2 * Math.PI) / teeth;
  const profile: [number, number][] = [
    [-0.5, root],
    [-0.3, root],
    [-0.17, tip],
    [0.17, tip],
    [0.3, root],
  ];
  const points: string[] = [];
  for (let i = 0; i < teeth; i++) {
    for (const [f, radius] of profile) {
      const a = (i + f) * pitch;
      points.push(`${(radius * Math.cos(a)).toFixed(2)} ${(radius * Math.sin(a)).toFixed(2)}`);
    }
  }
  return `M ${points.join(" L ")} Z`;
}

/** Needle rotation for an rpm on the half-dial: 0 rpm points left, max points right. */
function needleAngle(rpm: number): number {
  const f = Math.min(1, Math.max(0, rpm / GAUGE.max));
  return 180 * f - 180;
}

const smooth = (k: number) => k * k * (3 - 2 * k);

function answerOf(outcome: Outcome): string {
  return outcome.result.type === "choice" ? outcome.result.value : String(outcome.result.value);
}

function formatRpm(rpm: number): string {
  return `${rpm >= 100 ? Math.round(rpm) : Math.round(rpm * 10) / 10} rpm`;
}

export function GearsStage({ def, build, outcome, ghost, phase }: StageProps) {
  const driverRef = useRef<SVGGElement>(null);
  const drivenRef = useRef<SVGGElement>(null);
  const needleRef = useRef<SVGGElement>(null);

  const driverTeeth = Math.round(numberSetting(def, build, "driver", 12));
  const drivenTeeth = Math.round(numberSetting(def, build, "driven", 36));
  const r1 = pitchRadius(driverTeeth);
  const r2 = pitchRadius(drivenTeeth);
  // Centre the pair in the gear area; the output gear sits to the right.
  const span = r1 + ADDENDUM + (r1 + r2) + r2 + ADDENDUM;
  const x1 = GEAR_AREA_CX - span / 2 + r1 + ADDENDUM;
  const x2 = x1 + r1 + r2;
  // Turn the output gear half a tooth so a gap faces the motor gear's tooth.
  const drivenPhase = 180 - 180 / drivenTeeth;

  const realRpm = outcome?.readings["driven.rpm"] ?? 0;
  const believedRpm = ghost?.readings["driven.rpm"];
  const torque = outcome?.readings["driven.torque"];
  const revealed = phase === "result" && outcome !== null;

  useEffect(() => {
    const driver = driverRef.current;
    const driven = drivenRef.current;
    const needle = needleRef.current;
    if (!outcome) {
      driver?.setAttribute("transform", "rotate(0)");
      driven?.setAttribute("transform", `rotate(${drivenPhase})`);
      needle?.setAttribute("transform", `rotate(${needleAngle(0)})`);
      return;
    }
    return playback.onFrame((t, values) => {
      // Timeline angles are counter-clockwise positive; SVG rotates clockwise.
      driver?.setAttribute("transform", `rotate(${(-(values.driverAngle ?? 0)).toFixed(2)})`);
      driven?.setAttribute("transform", `rotate(${(drivenPhase - (values.drivenAngle ?? 0)).toFixed(2)})`);
      const k = smooth(Math.min(1, t / SETTLE_SECONDS));
      needle?.setAttribute("transform", `rotate(${needleAngle(realRpm * k).toFixed(2)})`);
    });
  }, [outcome, drivenPhase, realRpm]);

  const label =
    `Two meshed gears. Motor gear: ${driverTeeth} teeth at ${MOTOR_RPM} rpm. Output gear: ${drivenTeeth} teeth.` +
    (revealed ? ` The output gear turns at ${formatRpm(realRpm)}.` : "") +
    (ghost && believedRpm !== undefined ? ` Dashed lilac needle: your prediction, about ${formatRpm(believedRpm)}.` : "");

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="size-full select-none" role="img" aria-label={label}>
      {/* Gears. */}
      <g transform={`translate(${x1} ${GEAR_CY})`}>
        <g ref={driverRef} transform="rotate(0)">
          <Gear teeth={driverTeeth} stroke={TOKENS.signal} />
        </g>
        <circle r={Math.max(9, r1 * 0.22)} fill={TOKENS.signal} fillOpacity={0.3} stroke={TOKENS.signal} strokeWidth={2} />
      </g>
      <g transform={`translate(${x2} ${GEAR_CY})`}>
        <g ref={drivenRef} transform={`rotate(${drivenPhase})`}>
          <Gear teeth={drivenTeeth} stroke={TOKENS.pearl} />
        </g>
        <circle r={Math.max(9, r2 * 0.22)} fill={TOKENS.void} stroke={TOKENS.pearl} strokeOpacity={0.7} strokeWidth={2} />
      </g>

      {/* Labels: the motor's below-left, the output's below-right, so they never collide. */}
      <g className="font-sans">
        <text x={x1 + 18} y={GEAR_CY + r1 + ADDENDUM + 36} textAnchor="end" className="fill-pearl text-[21px]">
          Motor gear
        </text>
        <text x={x1 + 18} y={GEAR_CY + r1 + ADDENDUM + 62} textAnchor="end" className="fill-pearl/70 font-mono text-[18px]">
          {driverTeeth} teeth · {MOTOR_RPM} rpm
        </text>
        <text x={x2 - 18} y={GEAR_CY + r2 + ADDENDUM + 36} className="fill-pearl text-[21px]">
          Output gear
        </text>
        <text x={x2 - 18} y={GEAR_CY + r2 + ADDENDUM + 62} className="fill-pearl/70 font-mono text-[18px]">
          {drivenTeeth} teeth · {revealed ? formatRpm(realRpm) : "? rpm"}
        </text>
        {revealed && torque !== undefined && (
          <text x={x2 - 18} y={GEAR_CY + r2 + ADDENDUM + 86} className="fill-pearl/55 font-mono text-[16px]">
            {torque >= 1 ? torque.toFixed(1) : torque.toFixed(2)}× the turning force
          </text>
        )}
      </g>

      <SpeedGauge needleRef={needleRef} ghostRpm={ghost ? believedRpm : undefined} />

      {/* Readout under the gauge: the real speed once the run is over, then the belief. */}
      <g className="font-mono" textAnchor="middle">
        <text x={GAUGE.cx} y={GAUGE.cy + 48} className="fill-pearl text-[28px]">
          {revealed ? formatRpm(realRpm) : "? rpm"}
        </text>
        {ghost && believedRpm !== undefined && (
          <>
            <text x={GAUGE.cx} y={GAUGE.cy + 84} className="fill-lilac text-[17px]">
              you said: {answerOf(ghost).toLowerCase()}
            </text>
            <text x={GAUGE.cx} y={GAUGE.cy + 108} className="fill-lilac/80 text-[16px]">
              your idea: about {formatRpm(believedRpm)}
            </text>
          </>
        )}
      </g>
      {ghost && <GhostKey x={40} y={VIEW_H - 24} />}
    </svg>
  );
}

function Gear({ teeth, stroke }: { teeth: number; stroke: string }) {
  const r = pitchRadius(teeth);
  return (
    <g>
      <path d={gearPath(teeth)} fill={TOKENS.pearl} fillOpacity={0.06} stroke={stroke} strokeOpacity={0.85} strokeWidth={2} strokeLinejoin="round" />
      <circle r={r - DEDENDUM - 6} fill="none" stroke={stroke} strokeOpacity={0.18} strokeWidth={1.5} />
      {/* An index mark near the rim makes the turning easy to follow. */}
      <circle cx={r - DEDENDUM - 14} cy={0} r={5} fill={stroke} />
      <line x1={0} y1={0} x2={r - DEDENDUM - 20} y2={0} stroke={stroke} strokeOpacity={0.35} strokeWidth={2} />
    </g>
  );
}

function SpeedGauge({ needleRef, ghostRpm }: { needleRef: Ref<SVGGElement>; ghostRpm: number | undefined }) {
  const { cx, cy, r, max } = GAUGE;
  const at = (rpm: number, radius: number) => {
    const a = Math.PI - (Math.min(max, rpm) / max) * Math.PI;
    return { x: cx + radius * Math.cos(a), y: cy - radius * Math.sin(a) };
  };
  const ticks = [0, 50, 100, 150, 200, 250, 300];
  const motor = at(MOTOR_RPM, r);
  const motorOut = at(MOTOR_RPM, r + 16);
  const motorText = at(MOTOR_RPM, r + 36);
  return (
    <g>
      <text x={cx} y={cy - r - 56} textAnchor="middle" className="fill-pearl/60 font-sans text-[18px]">
        Output gear speed
      </text>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={TOKENS.pearl}
        strokeOpacity={0.25}
        strokeWidth={10}
        strokeLinecap="round"
      />
      {ticks.map((rpm) => {
        const inner = at(rpm, r - 16);
        const outer = at(rpm, r - 4);
        const text = at(rpm, r - 36);
        return (
          <g key={rpm}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={TOKENS.pearl} strokeOpacity={0.5} strokeWidth={2} />
            {rpm % 100 === 0 && (
              <text x={text.x} y={text.y + 6} textAnchor="middle" className="fill-pearl/55 font-mono text-[15px]">
                {rpm}
              </text>
            )}
          </g>
        );
      })}
      {/* The motor's own speed, for faster / slower at a glance. */}
      <line x1={motor.x} y1={motor.y} x2={motorOut.x} y2={motorOut.y} stroke={TOKENS.signal} strokeWidth={4} strokeLinecap="round" />
      <text x={motorText.x} y={motorText.y} textAnchor="end" className="fill-signal font-mono text-[15px]">
        motor {MOTOR_RPM}
      </text>
      {ghostRpm !== undefined && (
        <g transform={`translate(${cx} ${cy}) rotate(${needleAngle(ghostRpm)})`}>
          <line x1={0} y1={0} x2={r - 10} y2={0} stroke={TOKENS.lilac} strokeWidth={3} strokeDasharray="7 6" strokeLinecap="round" />
        </g>
      )}
      <g transform={`translate(${cx} ${cy})`}>
        <g ref={needleRef} transform={`rotate(${needleAngle(0)})`}>
          <line x1={0} y1={0} x2={r - 14} y2={0} stroke={TOKENS.pearl} strokeWidth={4} strokeLinecap="round" />
        </g>
        <circle r={9} fill={TOKENS.pearl} />
      </g>
      <text x={cx} y={cy + 20} textAnchor="middle" className="fill-pearl/45 font-mono text-[13px]">
        rpm
      </text>
    </g>
  );
}

function GhostKey({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <line x1={0} y1={0} x2={26} y2={0} stroke={TOKENS.lilac} strokeWidth={3} strokeDasharray="6 5" />
      <text x={36} y={6} className="fill-lilac font-mono text-[16px]">
        Dashed = your prediction
      </text>
    </g>
  );
}
