"use client";

import { useEffect, useRef, type Ref } from "react";
import { DISPLAY_HZ, MAX_RPM, PWM_HZ, SUPPLY_VOLTS } from "@/engine/robotics/pwm";
import { numberSetting } from "@/engine/robotics/settings";
import type { Outcome } from "@/engine/types";
import { TOKENS } from "@/lib/tokens";
import { playback, sample } from "@/components/lab/playback";
import type { StageProps } from "@/components/lab/stages";

/*
 * PWM stage: an oscilloscope of the supply switching on and off, the motor
 * it feeds, and a speed gauge. The real switching (1000 times a second) is
 * far too fast to see, so the trace is drawn slowed down and says so. Before
 * a run the trace previews the duty cycle and nothing spins; during a run the
 * trace scrolls, the rotor turns from the timeline's `angle`, and the needle
 * follows `rpm`. After a wrong verdict a dashed lilac needle shows the
 * believed speed, plus a dashed stop–start arc for the stutter belief.
 */

const VIEW_W = 1200;
const VIEW_H = 520;
const SCOPE = { x: 40, y: 20, w: 1120, h: 158 };
const PLOT = { x0: 140, x1: 1130, yOn: 60, yOff: 150 };
/** Seconds of (slowed) signal across the scope. */
const WINDOW = 1.5;
const MOTOR = { cx: 220, cy: 352, r: 86 };
const GAUGE = { cx: 680, cy: 448, r: 158 };
const SLOW_DOWN = Math.round(PWM_HZ / DISPLAY_HZ);

/** The displayed signal at time tau: on for the first `duty` of each slowed-down cycle. */
function level(duty: number, tau: number): number {
  if (duty >= 1) return 1;
  if (duty <= 0) return 0;
  return (tau * DISPLAY_HZ) % 1 < duty ? 1 : 0;
}

/** Square-wave path for the signal between two times, mapped to x by `toX`. */
function wave(duty: number, from: number, to: number, toX: (tau: number) => number): string {
  if (to <= from) return "";
  const y = (on: number) => (on ? PLOT.yOn : PLOT.yOff);
  const edges: { at: number; on: number }[] = [];
  if (duty > 0 && duty < 1) {
    for (let k = Math.floor(from * DISPLAY_HZ); k <= Math.ceil(to * DISPLAY_HZ); k++) {
      const rise = k / DISPLAY_HZ;
      const fall = (k + duty) / DISPLAY_HZ;
      if (rise > from && rise < to) edges.push({ at: rise, on: 1 });
      if (fall > from && fall < to) edges.push({ at: fall, on: 0 });
    }
    edges.sort((a, b) => a.at - b.at);
  }
  let d = `M ${toX(from).toFixed(1)} ${y(level(duty, from))}`;
  for (const e of edges) d += ` H ${toX(e.at).toFixed(1)} V ${y(e.on)}`;
  return `${d} H ${toX(to).toFixed(1)}`;
}

/** Before a run: a still preview of the first WINDOW seconds. */
function previewWave(duty: number): string {
  return wave(duty, 0, WINDOW, (tau) => PLOT.x0 + (tau / WINDOW) * (PLOT.x1 - PLOT.x0));
}

/** During a run: the last WINDOW seconds, newest at the right edge. */
function rollingWave(duty: number, t: number): string {
  return wave(duty, Math.max(0, t - WINDOW), t, (tau) => PLOT.x1 - ((t - tau) / WINDOW) * (PLOT.x1 - PLOT.x0));
}

/** Needle rotation on the half-dial: stopped points left, full speed points right. */
function needleAngle(rpm: number, maxRpm: number): number {
  const f = Math.min(1, Math.max(0, rpm / maxRpm));
  return 180 * f - 180;
}

function answerOf(outcome: Outcome): string {
  return outcome.result.type === "choice" ? outcome.result.value : String(outcome.result.value);
}

export function PwmStage({ def, build, outcome, ghost, phase }: StageProps) {
  const traceRef = useRef<SVGPathElement>(null);
  const rotorRef = useRef<SVGGElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const ghostNeedleRef = useRef<SVGGElement>(null);
  const supplyRef = useRef<SVGLineElement>(null);
  const rpmRef = useRef<SVGTextElement>(null);

  const dutyPct = numberSetting(def, build, "duty", 50);
  const duty = Math.min(1, Math.max(0, dutyPct / 100));
  const maxRpm = outcome?.readings["motor.maxRpm"] ?? MAX_RPM;
  const avgVolts = outcome?.readings["motor.avgVoltage"];
  const stutterBelief = (ghost?.readings["motor.ripple"] ?? 0) > 0.25;
  const believedRpm = ghost?.readings["motor.rpm"];

  useEffect(() => {
    const trace = traceRef.current;
    if (!outcome) {
      trace?.setAttribute("d", previewWave(duty));
      rotorRef.current?.setAttribute("transform", "rotate(0)");
      needleRef.current?.setAttribute("transform", `rotate(${needleAngle(0, maxRpm)})`);
      supplyRef.current?.setAttribute("stroke-opacity", "0.25");
      if (rpmRef.current) rpmRef.current.textContent = "— rpm";
      return;
    }
    const frames = outcome.timeline ?? [];
    const total = frames.length > 1 ? frames[frames.length - 1].t : 1;
    return playback.onFrame((t, values) => {
      trace?.setAttribute("d", rollingWave(duty, t));
      rotorRef.current?.setAttribute("transform", `rotate(${(values.angle ?? 0).toFixed(1)})`);
      const rpm = values.rpm ?? 0;
      needleRef.current?.setAttribute("transform", `rotate(${needleAngle(rpm, maxRpm).toFixed(2)})`);
      supplyRef.current?.setAttribute("stroke-opacity", (values.signal ?? 0) > 0.5 ? "1" : "0.25");
      if (rpmRef.current) rpmRef.current.textContent = `${Math.round(rpm)} rpm`;
      if (ghost) {
        const believed = sample(ghost.timeline, t).rpm ?? 0;
        const needle = ghostNeedleRef.current;
        needle?.setAttribute("transform", `rotate(${needleAngle(believed, maxRpm).toFixed(2)})`);
        // A stop-start belief has no one speed to rest on: its needle swings only while it replays.
        needle?.setAttribute("opacity", !stutterBelief || (t > 0 && t < total) ? "1" : "0");
      }
    });
  }, [outcome, ghost, duty, maxRpm, stutterBelief]);

  const running = outcome !== null;
  const avgY = PLOT.yOff - duty * (PLOT.yOff - PLOT.yOn);
  const label =
    `Oscilloscope of the motor's supply at ${dutyPct}% duty, switching ${PWM_HZ} times a second (drawn ${SLOW_DOWN} times slower), the motor, and a speed gauge.` +
    (phase === "result" && outcome ? ` The motor settles at ${Math.round(outcome.readings["motor.rpm"] ?? 0)} rpm.` : "") +
    (ghost ? ` Dashed lilac: your prediction, ${answerOf(ghost).toLowerCase()}.` : "");

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="size-full select-none" role="img" aria-label={label}>
      {/* Oscilloscope. */}
      <rect x={SCOPE.x} y={SCOPE.y} width={SCOPE.w} height={SCOPE.h} rx={18} fill={TOKENS.pearl} fillOpacity={0.03} stroke={TOKENS.pearl} strokeOpacity={0.14} />
      {Array.from({ length: 9 }, (_, i) => {
        const x = PLOT.x0 + (i / 8) * (PLOT.x1 - PLOT.x0);
        return <line key={i} x1={x} y1={PLOT.yOn - 14} x2={x} y2={PLOT.yOff + 14} stroke={TOKENS.pearl} strokeOpacity={0.06} />;
      })}
      <line x1={PLOT.x0} y1={PLOT.yOn} x2={PLOT.x1} y2={PLOT.yOn} stroke={TOKENS.pearl} strokeOpacity={0.1} />
      <line x1={PLOT.x0} y1={PLOT.yOff} x2={PLOT.x1} y2={PLOT.yOff} stroke={TOKENS.pearl} strokeOpacity={0.18} />
      <text x={PLOT.x0 - 18} y={PLOT.yOn + 6} textAnchor="end" className="fill-pearl/70 font-mono text-[17px]">
        {SUPPLY_VOLTS} V
      </text>
      <text x={PLOT.x0 - 18} y={PLOT.yOff + 6} textAnchor="end" className="fill-pearl/70 font-mono text-[17px]">
        0 V
      </text>
      <text x={PLOT.x0} y={SCOPE.y + 26} className="fill-pearl/60 font-sans text-[16px]">
        Power to the motor · duty {dutyPct}%
      </text>
      <text x={PLOT.x1} y={SCOPE.y + 26} textAnchor="end" className="fill-pearl/60 font-sans text-[16px]">
        Switching shown {SLOW_DOWN}× slower (really {PWM_HZ} times a second)
      </text>
      {running && avgVolts !== undefined && (
        <g>
          <line x1={PLOT.x0} y1={avgY} x2={PLOT.x1} y2={avgY} stroke={TOKENS.pearl} strokeOpacity={0.55} strokeWidth={1.5} />
          <text x={PLOT.x1 - 8} y={avgY - 8} textAnchor="end" className="fill-pearl/80 font-mono text-[15px]">
            average {avgVolts.toFixed(1)} V
          </text>
        </g>
      )}
      <path
        ref={traceRef}
        d={previewWave(duty)}
        fill="none"
        stroke={running ? TOKENS.signal : TOKENS.pearl}
        strokeOpacity={running ? 1 : 0.45}
        strokeWidth={3}
        strokeLinejoin="round"
      />

      {/* The supply lead from the controller to the motor: lit while the (slowed) signal is on. */}
      <line
        ref={supplyRef}
        x1={MOTOR.cx}
        y1={SCOPE.y + SCOPE.h}
        x2={MOTOR.cx}
        y2={MOTOR.cy - MOTOR.r}
        stroke={TOKENS.signal}
        strokeOpacity={0.25}
        strokeWidth={4}
        strokeLinecap="round"
      />

      <Motor rotorRef={rotorRef} />

      <Gauge needleRef={needleRef} ghostNeedleRef={ghostNeedleRef} ghost={ghost !== null} stutter={stutterBelief} maxRpm={maxRpm} />

      {/* Readout. */}
      <g className="font-mono" textAnchor="middle">
        <text x={1040} y={252} className="fill-pearl/60 font-sans text-[17px]">
          Motor speed
        </text>
        <text ref={rpmRef} x={1040} y={290} className="fill-pearl text-[30px]">
          — rpm
        </text>
        <text x={1040} y={314} className="fill-pearl/50 text-[15px]">
          of {maxRpm} rpm max
        </text>
        <text x={1040} y={356} className="fill-pearl/60 font-sans text-[17px]">
          Average voltage
        </text>
        <text x={1040} y={390} className="fill-pearl text-[26px]">
          {running && avgVolts !== undefined ? `${avgVolts.toFixed(2)} V` : "— V"}
        </text>
        {ghost && (
          <>
            <text x={1040} y={438} className="fill-lilac text-[16px]">
              you said:
            </text>
            <text x={1040} y={460} className="fill-lilac text-[16px]">
              {answerOf(ghost).toLowerCase()}
            </text>
            {!stutterBelief && believedRpm !== undefined && (
              <text x={1040} y={482} className="fill-lilac/80 text-[15px]">
                about {Math.round(believedRpm)} rpm
              </text>
            )}
          </>
        )}
      </g>
      {ghost && <GhostKey x={952} y={VIEW_H - 14} />}
    </svg>
  );
}

function Motor({ rotorRef }: { rotorRef: Ref<SVGGElement> }) {
  const { cx, cy, r } = MOTOR;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={TOKENS.pearl} fillOpacity={0.05} stroke={TOKENS.pearl} strokeOpacity={0.45} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={r - 14} fill="none" stroke={TOKENS.pearl} strokeOpacity={0.12} strokeWidth={10} />
      <g transform={`translate(${cx} ${cy})`}>
        <g ref={rotorRef} transform="rotate(0)">
          {[0, 120, 240].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <line x1={0} y1={0} x2={0} y2={-(r - 30)} stroke={TOKENS.signal} strokeWidth={9} strokeLinecap="round" />
            </g>
          ))}
          <circle cx={0} cy={-(r - 30)} r={7} fill={TOKENS.pearl} />
        </g>
        <circle r={13} fill={TOKENS.void} stroke={TOKENS.pearl} strokeOpacity={0.7} strokeWidth={2} />
      </g>
      <text x={cx} y={cy + r + 34} textAnchor="middle" className="fill-pearl font-sans text-[20px]">
        Motor
      </text>
      <text x={cx} y={cy + r + 58} textAnchor="middle" className="fill-pearl/60 font-mono text-[15px]">
        {SUPPLY_VOLTS} V supply
      </text>
    </g>
  );
}

function Gauge({
  needleRef,
  ghostNeedleRef,
  ghost,
  stutter,
  maxRpm,
}: {
  needleRef: Ref<SVGGElement>;
  ghostNeedleRef: Ref<SVGGElement>;
  ghost: boolean;
  stutter: boolean;
  maxRpm: number;
}) {
  const { cx, cy, r } = GAUGE;
  const at = (f: number, radius: number) => {
    const a = Math.PI - f * Math.PI;
    return { x: cx + radius * Math.cos(a), y: cy - radius * Math.sin(a) };
  };
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <g>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={TOKENS.pearl} strokeOpacity={0.25} strokeWidth={10} strokeLinecap="round" />
      {ticks.map((f) => {
        const inner = at(f, r - 16);
        const outer = at(f, r - 4);
        const text = at(f, r - 38);
        return (
          <g key={f}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={TOKENS.pearl} strokeOpacity={0.5} strokeWidth={2} />
            <text x={text.x} y={text.y + 6} textAnchor="middle" className="fill-pearl/55 font-mono text-[15px]">
              {Math.round(f * maxRpm)}
            </text>
          </g>
        );
      })}
      {stutter && (
        <g>
          <path
            d={`M ${cx - r - 18} ${cy} A ${r + 18} ${r + 18} 0 0 1 ${cx + r + 18} ${cy}`}
            fill="none"
            stroke={TOKENS.lilac}
            strokeWidth={3}
            strokeDasharray="8 7"
          />
          <text x={cx} y={cy - r - 30} textAnchor="middle" className="fill-lilac font-mono text-[15px]">
            you said: stop–start
          </text>
        </g>
      )}
      {ghost && (
        <g transform={`translate(${cx} ${cy})`}>
          <g ref={ghostNeedleRef} transform={`rotate(${needleAngle(0, maxRpm)})`}>
            <line x1={0} y1={0} x2={r - 12} y2={0} stroke={TOKENS.lilac} strokeWidth={3} strokeDasharray="7 6" strokeLinecap="round" />
          </g>
        </g>
      )}
      <g transform={`translate(${cx} ${cy})`}>
        <g ref={needleRef} transform={`rotate(${needleAngle(0, maxRpm)})`}>
          <line x1={0} y1={0} x2={r - 16} y2={0} stroke={TOKENS.pearl} strokeWidth={4} strokeLinecap="round" />
        </g>
        <circle r={9} fill={TOKENS.pearl} />
      </g>
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
