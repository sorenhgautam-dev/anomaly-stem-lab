"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import type { LevelId } from "@/engine/types";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/motion";
import { animate, Spring, stopAnimating } from "@/lib/motion-loop";
import { detentClick } from "@/lib/sound";
import { RollingLetters } from "@/components/ui/RollingText";

/*
 * The level knob: a lab instrument's selector knob on a paper faceplate. A
 * 270° scale runs from grade 6 to grade 12 with a tick for every grade (and
 * every half), the three level zones in their colours outside it, and an LCD
 * in the gap below showing the grade and level. The knurled knob carries a
 * gold needle; drag it round (or click a grade, or use the arrow keys: it's
 * a slider to assistive tech) and it follows on a spring, clicking through a
 * detent at every grade and settling onto the nearest one when let go.
 */

export const GRADE_MIN = 6;
export const GRADE_MAX = 12;

export function levelForGrade(grade: number): LevelId {
  return grade <= 8 ? "easy" : grade <= 10 ? "medium" : "advanced";
}

/** The first grade of a level (where the knob goes when a level is picked directly). */
export function gradeForLevel(level: LevelId): number {
  return level === "easy" ? 6 : level === "medium" ? 9 : 11;
}

const C = 250;
const SWEEP = 135;
/** The knob's angle for a grade, in degrees clockwise from straight up. */
const angleFor = (g: number) => -SWEEP + ((g - GRADE_MIN) / (GRADE_MAX - GRADE_MIN)) * SWEEP * 2;
const gradeAt = (deg: number) => Math.round(GRADE_MIN + ((deg + SWEEP) / (SWEEP * 2)) * (GRADE_MAX - GRADE_MIN));
/** A point at an angle (clockwise from up) and radius. Rounded, so server and browser give the same markup. */
const round = (n: number) => Math.round(n * 100) / 100;
const at = (deg: number, r: number) => ({ x: round(C + r * Math.sin((deg * Math.PI) / 180)), y: round(C - r * Math.cos((deg * Math.PI) / 180)) });
const arc = (from: number, to: number, r: number) => {
  const a = at(from, r);
  const b = at(to, r);
  return `M${a.x} ${a.y}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
};

const ZONES: { level: LevelId; from: number; to: number; stroke: string }[] = [
  { level: "easy", from: 6, to: 8.5, stroke: "stroke-chem-sage" },
  { level: "medium", from: 8.5, to: 10.5, stroke: "stroke-chem-gold" },
  { level: "advanced", from: 10.5, to: 12, stroke: "stroke-chem-wall" },
];
const TITLE: Record<LevelId, string> = { easy: "Easy", medium: "Medium", advanced: "Advanced" };
const STEPS = Array.from({ length: (GRADE_MAX - GRADE_MIN) * 2 + 1 }, (_, i) => GRADE_MIN + i / 2);
/** The knurling round the knob's skirt. */
const RIDGES = Array.from({ length: 56 }, (_, i) => (i / 56) * 360);
const SCREWS = [
  [26, 26],
  [474, 26],
  [26, 474],
  [474, 474],
];

export function LevelKnob({ grade, onGrade, label, className }: { grade: number; onGrade: (g: number) => void; label: string; className?: string }) {
  const level = levelForGrade(grade);
  const svg = useRef<SVGSVGElement>(null);
  const knob = useRef<SVGGElement>(null);
  const angle = useRef(new Spring(angleFor(grade), 240, 16));
  const dragging = useRef(false);
  const last = useRef(grade);

  const draw = useCallback(() => knob.current?.setAttribute("transform", `rotate(${round(angle.current.x)} ${C} ${C})`), []);
  const tick = useCallback(
    (dt: number) => {
      const moving = angle.current.step(dt);
      draw();
      return moving;
    },
    [draw],
  );

  useEffect(() => {
    draw();
    return () => stopAnimating(tick);
  }, [draw, tick]);

  // Changes from outside (keys, a level picked directly) spring the knob round.
  useEffect(() => {
    last.current = grade;
    if (dragging.current) return;
    angle.current.target = angleFor(grade);
    if (prefersReducedMotion()) {
      angle.current.x = angle.current.target;
      draw();
    } else animate(tick);
  }, [grade, draw, tick]);

  const set = (g: number) => {
    const next = Math.min(GRADE_MAX, Math.max(GRADE_MIN, g));
    if (next === last.current) return;
    last.current = next;
    detentClick();
    onGrade(next);
  };

  /** The pointer's angle round the knob, clamped to the scale (the gap at the bottom snaps to the nearer end). */
  const pointerAngle = (e: PointerEvent) => {
    const box = svg.current!.getBoundingClientRect();
    const scale = box.width / 500;
    const dx = (e.clientX - box.left) / scale - C;
    const dy = (e.clientY - box.top) / scale - C;
    const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    return Math.max(-SWEEP, Math.min(SWEEP, deg));
  };

  const onPointerDown = (e: PointerEvent<SVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    onPointerMove(e);
  };
  const onPointerMove = (e: PointerEvent<SVGElement>) => {
    if (!dragging.current) return;
    const deg = pointerAngle(e);
    angle.current.target = deg;
    if (prefersReducedMotion()) angle.current.x = deg;
    animate(tick);
    set(gradeAt(deg));
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    angle.current.target = angleFor(last.current);
    animate(tick);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (step) set(last.current + step);
    else if (e.key === "Home") set(GRADE_MIN);
    else if (e.key === "End") set(GRADE_MAX);
    else return;
    e.preventDefault();
  };

  const grab = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={GRADE_MIN}
      aria-valuemax={GRADE_MAX}
      aria-valuenow={grade}
      aria-valuetext={`Grade ${grade}, ${TITLE[level]}`}
      onKeyDown={onKeyDown}
      className={cn("paper-card relative aspect-square w-full max-w-[30rem] select-none rounded-frame outline-none focus-visible:outline-2 focus-visible:outline-offset-4", className)}
    >
      <svg ref={svg} viewBox="0 0 500 500" className="h-auto w-full">
        {/* Faceplate screws. */}
        {SCREWS.map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${(x + y) % 90})`}>
            <circle r={9} className="fill-cream-200 stroke-ink-300" strokeWidth={1.5} />
            <line x1={-5} y1={0} x2={5} y2={0} className="stroke-ink-500" strokeWidth={2} strokeLinecap="round" />
          </g>
        ))}
        {/* The level zones outside the scale: the current one solid, the others faint. */}
        {ZONES.map((z) => (
          <path key={z.level} d={arc(angleFor(z.from) + (z.from > GRADE_MIN ? 1.5 : 0), angleFor(z.to) - (z.to < GRADE_MAX ? 1.5 : 0), 200)} fill="none" strokeWidth={10} strokeLinecap="round" className={cn(z.stroke, "transition-opacity duration-300", z.level === level ? "opacity-100" : "opacity-30")} />
        ))}
        {/* Ticks: long for grades, short for halves. */}
        {STEPS.map((g) => {
          const whole = Number.isInteger(g);
          const a = angleFor(g);
          const p0 = at(a, whole ? 166 : 176);
          const p1 = at(a, 188);
          return <line key={g} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} strokeWidth={whole ? 4 : 2} strokeLinecap="round" className={whole ? "stroke-ink-900" : "stroke-ink-300"} />;
        })}
        {/* Grade numbers, outside the zones; each one turns the knob to it. */}
        {STEPS.filter(Number.isInteger).map((g) => {
          const n = at(angleFor(g), 228);
          return (
            <text key={g} x={n.x} y={n.y + 8} textAnchor="middle" onClick={() => set(g)} className={cn("type-readout cursor-pointer text-[22px] transition-colors duration-200", g === grade ? "fill-ink-900" : "fill-ink-500 hover:fill-ink-900")}>
              {g}
            </text>
          );
        })}
        {/* The knob's shadow on the faceplate. */}
        <ellipse cx={C + 6} cy={C + 12} rx={124} ry={120} className="fill-ink-900/15" />
        {/* The knob: everything in here turns. */}
        <g ref={knob} {...grab} className="cursor-grab touch-none active:cursor-grabbing">
          {/* The needle, reaching out to the ticks. */}
          <path d={`M${C - 7} ${C - 110}L${C} ${C - 162}L${C + 7} ${C - 110}Z`} className="fill-robo-gold" />
          <circle cx={C} cy={C} r={120} className="fill-ink-900" />
          {RIDGES.map((d) => (
            <rect key={d} x={C - 3} y={C - 120} width={6} height={13} rx={3} transform={`rotate(${d} ${C} ${C})`} className="fill-ink-700" />
          ))}
          <circle cx={C} cy={C} r={100} className="fill-ink-700" />
          <circle cx={C} cy={C} r={92} className="fill-ink-900" />
          {/* A soft dish in the cap, and the light catching its upper edge. */}
          <circle cx={C} cy={C} r={68} className="fill-ink-700/60" />
          <path d={arc(-62, 38, 84)} fill="none" strokeWidth={6} strokeLinecap="round" className="stroke-white/25" />
          {/* The pointer line on the cap. */}
          <line x1={C} y1={C - 26} x2={C} y2={C - 86} strokeWidth={10} strokeLinecap="round" className="stroke-robo-gold" />
        </g>
      </svg>
      {/* The LCD in the gap under the knob. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[7%] flex justify-center">
        <div className="flex items-baseline gap-3 rounded-control bg-ink-900 px-4 py-2 inset-shadow-sm inset-shadow-black/60">
          <span className="type-readout text-[13px] text-chem-gold/70">Grade</span>
          <span key={grade} data-roll="go" className="type-readout inline-block text-[clamp(1.6rem,4vw,2.2rem)] leading-none text-chem-gold">
            <RollingLetters text={String(grade).padStart(2, "0")} />
          </span>
          <span className="type-readout text-[13px] text-chem-gold">{TITLE[level]}</span>
        </div>
      </div>
    </div>
  );
}
