"use client";

import { useEffect, useRef, type Ref } from "react";
import { MAX_WHEEL_SPEED, WHEELBASE } from "@/engine/robotics/kinematics";
import { numberSetting } from "@/engine/robotics/settings";
import type { Outcome, Point } from "@/engine/types";
import { TOKENS } from "@/lib/tokens";
import { playback, sample } from "@/components/lab/playback";
import type { StageProps } from "@/components/lab/stages";

/*
 * Robot stage (CLAUDE.md §6.4): the arena seen from above, one grid square
 * = 10 cm. The robot starts on the cross facing up ("north", as in the
 * engine). During a run it drives the simulated path: its trail grows with
 * the playback clock and each wheel's tread rolls at that wheel's speed.
 * After a wrong verdict the believed path is drawn dashed in lilac, and a
 * dashed ghost robot drives it in step with reality.
 *
 * Camera: before a run it frames a fixed area round the start, so nothing
 * hints at the answer. During a run the view grows, as a pure function of
 * the clock, to keep the path driven so far in view. It is always symmetric
 * left/right, so it never leans toward the answer, and it holds a mirrored
 * ghost path too. Labels on the floor are pinned in screen pixels, so they
 * stay readable at any zoom. Everything that moves is written straight to
 * the DOM from playback.onFrame or a ResizeObserver (no per-frame state).
 */

/** SVG units per cm. */
const S = 5;
/** Area framed before a run (cm): the robot, its wheel arrows and the start arrow. */
const BUILD_BOX: Box = { minX: -40, maxX: 40, minY: -22, maxY: 46 };
/** Room kept around the path (cm): the robot's half-length plus a margin. */
const PAD = 16;
const START_POSE = "translate(0 0) rotate(0)";
/** Wheel centres sit half the wheelbase out from the middle. */
const WHEEL_X = (WHEELBASE / 2) * S;
const WHEEL_W = 13;
const WHEEL_L = 36;
const TREAD_GAP = 9;

interface Box {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function svgXY(p: Point): string {
  return `${(p.x * S).toFixed(1)} ${(-p.y * S).toFixed(1)}`;
}

function pathD(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${svgXY(p)}`).join(" ");
}

/** A pose from timeline values: x, y (cm) and heading (degrees, + = counter-clockwise). */
function pose(values: Record<string, number>): string {
  const x = (values.x ?? 0) * S;
  const y = -(values.y ?? 0) * S;
  // World counter-clockwise is a negative SVG rotation (SVG's y axis points down).
  return `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(-(values.heading ?? 0)).toFixed(2)})`;
}

/** Tread bars slide toward the front as the wheel rolls forward. */
function tread(distanceCm: number): string {
  const units = distanceCm * S;
  const offset = ((units % TREAD_GAP) + TREAD_GAP) % TREAD_GAP;
  return `translate(0 ${(-offset).toFixed(2)})`;
}

function turnText(heading: number): string {
  const degrees = Math.round(Math.abs(heading));
  if (degrees === 0) return "0°, straight";
  return `${degrees}° ${heading > 0 ? "left" : "right"}`;
}

/** Grow a box (symmetric about x = 0) to hold the first `count` points with PAD to spare. */
function grow(box: Box, points: Point[] | null, count: number): Box {
  if (!points) return box;
  let { minX, maxX, minY, maxY } = box;
  for (let i = 0; i < Math.min(points.length, count); i++) {
    const p = points[i];
    const reach = Math.abs(p.x) + PAD;
    maxX = Math.max(maxX, reach);
    minX = Math.min(minX, -reach);
    maxY = Math.max(maxY, p.y + PAD);
    minY = Math.min(minY, p.y - PAD);
  }
  return { minX, maxX, minY, maxY };
}

/** Points of a path driven by time t (one point every 1/30 s), plus the next one. */
function pointsBy(points: Point[] | null, t: number, total: number): number {
  if (!points) return 0;
  return Math.floor((Math.min(1, Math.max(0, t / total)) * (points.length - 1))) + 2;
}

/** The box, centred, in a container of this shape (the spare side gets more floor). */
function viewBoxFor(box: Box, width: number, height: number) {
  const w0 = (box.maxX - box.minX) * S;
  const h0 = (box.maxY - box.minY) * S;
  const cx = ((box.minX + box.maxX) / 2) * S;
  const cy = (-(box.minY + box.maxY) / 2) * S;
  const aspect = width > 0 && height > 0 ? width / height : w0 / h0;
  const w = Math.max(w0, h0 * aspect);
  const h = w / aspect;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Write the view: the viewBox, screen-pixel labels, and the scale bar's length. */
function applyView(svg: SVGSVGElement, box: Box, width: number, height: number, scaleBar: HTMLElement | null) {
  const v = viewBoxFor(box, width, height);
  svg.setAttribute("viewBox", `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`);
  const unitsPerPx = width > 0 ? v.w / width : 1;
  svg.querySelectorAll<SVGGElement>("[data-pin]").forEach((g) => {
    g.setAttribute("transform", `translate(${g.dataset.x} ${g.dataset.y}) scale(${unitsPerPx.toFixed(4)})`);
  });
  if (scaleBar) scaleBar.style.width = `${((10 * S) / unitsPerPx).toFixed(1)}px`;
}

const sameBox = (a: Box, b: Box) => a.minX === b.minX && a.maxX === b.maxX && a.minY === b.minY && a.maxY === b.maxY;

function answerOf(outcome: Outcome): string {
  return outcome.result.type === "choice" ? outcome.result.value : String(outcome.result.value);
}

export function RobotArena({ def, build, outcome, ghost, phase }: StageProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const size = useRef({ width: 0, height: 0 });
  const view = useRef<Box>(BUILD_BOX);
  const scaleBarRef = useRef<HTMLDivElement>(null);
  const robotRef = useRef<SVGGElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const trailGlowRef = useRef<SVGPathElement>(null);
  const treadLeftRef = useRef<SVGGElement>(null);
  const treadRightRef = useRef<SVGGElement>(null);
  const ghostRef = useRef<SVGGElement>(null);
  const turnRef = useRef<HTMLSpanElement>(null);
  const distanceRef = useRef<HTMLSpanElement>(null);

  const leftPct = numberSetting(def, build, "left", 0);
  const rightPct = numberSetting(def, build, "right", 0);
  const vLeft = (leftPct / 100) * MAX_WHEEL_SPEED;
  const vRight = (rightPct / 100) * MAX_WHEEL_SPEED;
  const real = outcome?.path && outcome.path.length > 1 ? outcome.path : null;
  const believed = ghost?.path && ghost.path.length > 1 ? ghost.path : null;

  // Follow the container's shape.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => {
      size.current = { width: entry.contentRect.width, height: entry.contentRect.height };
      applyView(svg, view.current, size.current.width, size.current.height, scaleBarRef.current);
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  // Drive the robot, its trail, its wheels, the ghost and the camera from the playback clock.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const show = (box: Box, force: boolean) => {
      if (!force && sameBox(box, view.current)) return;
      view.current = box;
      applyView(svg, box, size.current.width, size.current.height, scaleBarRef.current);
    };
    if (!outcome) {
      show(BUILD_BOX, true);
      robotRef.current?.setAttribute("transform", START_POSE);
      treadLeftRef.current?.setAttribute("transform", "translate(0 0)");
      treadRightRef.current?.setAttribute("transform", "translate(0 0)");
      if (turnRef.current) turnRef.current.textContent = "—";
      if (distanceRef.current) distanceRef.current.textContent = "—";
      return;
    }
    const frames = outcome.timeline ?? [];
    const total = frames.length > 1 ? frames[frames.length - 1].t : 1;
    const distance = outcome.readings["robot.distance"] ?? 0;
    let first = true;
    return playback.onFrame((t, values) => {
      const k = Math.min(1, Math.max(0, t / total));
      show(grow(grow(BUILD_BOX, real, pointsBy(real, t, total)), believed, pointsBy(believed, t, total)), first);
      first = false;
      robotRef.current?.setAttribute("transform", pose(values));
      trailRef.current?.setAttribute("stroke-dashoffset", String(1 - k));
      trailGlowRef.current?.setAttribute("stroke-dashoffset", String(1 - k));
      treadLeftRef.current?.setAttribute("transform", tread(vLeft * t));
      treadRightRef.current?.setAttribute("transform", tread(vRight * t));
      if (ghost) ghostRef.current?.setAttribute("transform", pose(sample(ghost.timeline, t)));
      if (turnRef.current) turnRef.current.textContent = turnText(values.heading ?? 0);
      if (distanceRef.current) distanceRef.current.textContent = `${Math.round(distance * k)} cm`;
    });
  }, [outcome, ghost, real, believed, vLeft, vRight]);

  const ghostEnd = believed ? believed[believed.length - 1] : null;
  const turned = outcome?.readings["robot.turn"];
  const label =
    `Arena seen from above. The robot starts on the cross, facing up. Left wheel ${leftPct}%, right wheel ${rightPct}%.` +
    (phase === "result" && turned !== undefined ? ` It turned ${turnText(turned)}.` : "") +
    (ghost ? ` Dashed lilac: the path you predicted (${answerOf(ghost)}).` : "");
  const initial = viewBoxFor(BUILD_BOX, 0, 0);

  return (
    <div className="relative size-full">
      <svg
        ref={svgRef}
        viewBox={`${initial.x} ${initial.y} ${initial.w} ${initial.h}`}
        className="size-full select-none"
        role="img"
        aria-label={label}
      >
        <defs>
          <pattern id="arena-minor" width={10 * S} height={10 * S} patternUnits="userSpaceOnUse">
            <path d={`M ${10 * S} 0 L 0 0 0 ${10 * S}`} fill="none" stroke={TOKENS.pearl} strokeOpacity={0.07} strokeWidth={1} />
          </pattern>
          <pattern id="arena-major" width={50 * S} height={50 * S} patternUnits="userSpaceOnUse">
            <rect width={50 * S} height={50 * S} fill="url(#arena-minor)" />
            <path d={`M ${50 * S} 0 L 0 0 0 ${50 * S}`} fill="none" stroke={TOKENS.pearl} strokeOpacity={0.15} strokeWidth={1.5} />
          </pattern>
          <filter id="arena-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <clipPath id="arena-wheel-left">
            <rect x={-WHEEL_X - WHEEL_W / 2} y={-WHEEL_L / 2} width={WHEEL_W} height={WHEEL_L} rx={4} />
          </clipPath>
          <clipPath id="arena-wheel-right">
            <rect x={WHEEL_X - WHEEL_W / 2} y={-WHEEL_L / 2} width={WHEEL_W} height={WHEEL_L} rx={4} />
          </clipPath>
        </defs>

        {/* The floor: a grid that reaches past any framing. */}
        <rect x={-4000} y={-4000} width={8000} height={8000} fill="url(#arena-major)" />

        {/* Start: a cross on the floor, and before a run an arrow showing which way the robot faces. */}
        <g stroke={TOKENS.pearl} strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round">
          <line x1={-12} y1={0} x2={12} y2={0} />
          <line x1={0} y1={-12} x2={0} y2={12} />
        </g>
        <g data-pin="" data-x={0} data-y={9 * S} pointerEvents="none">
          <text y={12} textAnchor="middle" className="fill-pearl/55 font-sans text-[13px]">
            start
          </text>
        </g>
        {phase === "build" && (
          <g opacity={0.45} pointerEvents="none">
            <line x1={0} y1={-46} x2={0} y2={-118} stroke={TOKENS.pearl} strokeWidth={2.5} strokeDasharray="6 7" strokeLinecap="round" />
            <path d="M -9 -110 L 0 -126 L 9 -110" fill="none" stroke={TOKENS.pearl} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {/* The believed path (dashed lilac), under reality. */}
        {believed && (
          <path
            d={pathD(believed)}
            fill="none"
            stroke={TOKENS.lilac}
            strokeOpacity={0.9}
            strokeWidth={3}
            strokeDasharray="10 9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Reality's trail grows with the clock: a dash as long as the path, slid into view. */}
        {real && (
          <g pointerEvents="none">
            <path
              ref={trailGlowRef}
              d={pathD(real)}
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1}
              fill="none"
              stroke={TOKENS.signal}
              strokeOpacity={0.55}
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#arena-glow)"
            />
            <path
              ref={trailRef}
              d={pathD(real)}
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1}
              fill="none"
              stroke={TOKENS.signal}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {ghost && (
          <g ref={ghostRef} transform={START_POSE} pointerEvents="none">
            <RobotShape ghost />
          </g>
        )}

        <g ref={robotRef} transform={START_POSE}>
          <RobotShape treadLeft={treadLeftRef} treadRight={treadRightRef} />
          {phase === "build" && <WheelPush leftPct={leftPct} rightPct={rightPct} />}
        </g>

        {ghostEnd && ghost && (
          <g data-pin="" data-x={(ghostEnd.x * S).toFixed(1)} data-y={(-(ghostEnd.y + 12) * S).toFixed(1)} pointerEvents="none">
            <text
              textAnchor="middle"
              className="fill-lilac font-mono text-[13px]"
              stroke={TOKENS.void}
              strokeWidth={4}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              you said: {answerOf(ghost).toLowerCase()}
            </text>
          </g>
        )}
      </svg>

      {/* Instrument readout: the inputs always, the outcome only once it has run. */}
      <div className="glass pointer-events-none absolute left-3 top-3 rounded-[14px] px-4 py-3 sm:left-4 sm:top-4">
        <dl className="grid grid-cols-[auto_auto] gap-x-5 gap-y-1.5 text-[13px]">
          <dt className="text-pearl/55">Left wheel</dt>
          <dd className="text-right font-mono text-pearl">{leftPct}%</dd>
          <dt className="text-pearl/55">Right wheel</dt>
          <dd className="text-right font-mono text-pearl">{rightPct}%</dd>
          <dt className="text-pearl/55">Turned</dt>
          <dd className="text-right font-mono text-pearl">
            <span ref={turnRef}>—</span>
          </dd>
          <dt className="text-pearl/55">Distance</dt>
          <dd className="text-right font-mono text-pearl">
            <span ref={distanceRef}>—</span>
          </dd>
        </dl>
      </div>

      {/* Scale bar, kept true to the current zoom. */}
      <div className="pointer-events-none absolute bottom-3 right-4 flex flex-col items-center gap-1 font-mono text-[12px] text-pearl/60 sm:bottom-4 sm:right-5">
        <div ref={scaleBarRef} className="h-1.5 border-x border-b border-pearl/60" style={{ width: 54 }} />
        10 cm
      </div>
      {ghost && <GhostKey />}
    </div>
  );
}

/** The robot from above, facing up. The real one gets rolling treads; the ghost is a dashed outline. */
function RobotShape({
  ghost = false,
  treadLeft,
  treadRight,
}: {
  ghost?: boolean;
  treadLeft?: Ref<SVGGElement>;
  treadRight?: Ref<SVGGElement>;
}) {
  const wheels = [
    { side: "left", x: -WHEEL_X, ref: treadLeft },
    { side: "right", x: WHEEL_X, ref: treadRight },
  ] as const;
  if (ghost) {
    return (
      <g fill="none" stroke={TOKENS.lilac} strokeWidth={2.5} strokeDasharray="6 6" opacity={0.95}>
        {wheels.map((w) => (
          <rect key={w.side} x={w.x - WHEEL_W / 2} y={-WHEEL_L / 2} width={WHEEL_W} height={WHEEL_L} rx={4} />
        ))}
        <rect x={-22} y={-32} width={44} height={62} rx={13} />
        <path d="M -9 -8 L 0 -18 L 9 -8" strokeDasharray="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }
  return (
    <g>
      {wheels.map((w) => (
        <g key={w.side}>
          <rect x={w.x - WHEEL_W / 2} y={-WHEEL_L / 2} width={WHEEL_W} height={WHEEL_L} rx={4} fill={TOKENS.void} stroke={TOKENS.pearl} strokeOpacity={0.6} strokeWidth={1.5} />
          <g clipPath={`url(#arena-wheel-${w.side})`}>
            <g ref={w.ref}>
              {Array.from({ length: Math.ceil(WHEEL_L / TREAD_GAP) + 3 }, (_, i) => {
                const y = -WHEEL_L / 2 + (i - 1) * TREAD_GAP;
                return <line key={i} x1={w.x - WHEEL_W / 2} y1={y} x2={w.x + WHEEL_W / 2} y2={y} stroke={TOKENS.pearl} strokeOpacity={0.5} strokeWidth={2} />;
              })}
            </g>
          </g>
        </g>
      ))}
      {/* Body, with a chevron pointing forward and a sensor on the nose. */}
      <rect x={-22} y={-32} width={44} height={62} rx={13} fill="#10121b" stroke={TOKENS.pearl} strokeOpacity={0.75} strokeWidth={2} />
      <path d="M -9 -8 L 0 -18 L 9 -8" fill="none" stroke={TOKENS.pearl} strokeOpacity={0.85} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={0} cy={-25} r={4.5} fill={TOKENS.signal} />
    </g>
  );
}

/** Before a run: an arrow beside each wheel, as long as that wheel's speed. */
function WheelPush({ leftPct, rightPct }: { leftPct: number; rightPct: number }) {
  const arrows = [
    { x: -WHEEL_X - 24, pct: leftPct, anchor: "end" as const, side: "L" },
    { x: WHEEL_X + 24, pct: rightPct, anchor: "start" as const, side: "R" },
  ];
  return (
    <g pointerEvents="none">
      {arrows.map((a) => {
        const length = 8 + (Math.max(0, a.pct) / 100) * 70;
        return (
          <g key={a.side}>
            <line x1={a.x} y1={18} x2={a.x} y2={18 - length} stroke={TOKENS.signal} strokeWidth={3} strokeLinecap="round" />
            <path d={`M ${a.x - 6} ${26 - length} L ${a.x} ${16 - length} L ${a.x + 6} ${26 - length}`} fill="none" stroke={TOKENS.signal} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <text x={a.x + (a.anchor === "end" ? -9 : 9)} y={14} textAnchor={a.anchor} className="fill-pearl/80 font-mono text-[13px]">
              {a.pct}%
            </text>
          </g>
        );
      })}
    </g>
  );
}

function GhostKey() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 font-mono text-[12px] text-lilac sm:bottom-4 sm:left-4">
      <svg viewBox="0 0 24 12" className="h-3 w-6" aria-hidden>
        <line x1={1} y1={6} x2={23} y2={6} stroke={TOKENS.lilac} strokeWidth={2} strokeDasharray="4 3" />
      </svg>
      Dashed = your prediction
    </div>
  );
}
