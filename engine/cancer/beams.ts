import type { Build, ExperimentDef, Simulate } from "../types";
import { clamp, makeTimeline, numberSetting, RUN_SECONDS } from "../chemistry/common";

/*
 * Stage "beams": why radiotherapy aims from several angles (experiment
 * "Radiotherapy beams", CLAUDE.md §3.5). A teaching model on a flat slice
 * of an abstract body (an oval, seen from above) with the tumour in the
 * middle. Four plans share the same total beam strength:
 *   one     one strong beam straight in from the top
 *   angles  N weaker beams spread evenly all around
 *   slide   one beam that slides side to side across the top
 *   side    N weaker beams, all from the top, `gap` degrees apart
 * Each beam fires in turn. Dose at a point = the sum over beams of beam
 * strength × e^(−μ × depth along the beam) inside the beam's width
 * (NCI: many beams from different directions, "each beam has very little
 * effect on the tissue it passes through", and the dose is delivered where
 * they all meet). Every dose is a model value: a % of the dose the tumour
 * needs (what one strong beam from the top gives it), never a real dose.
 *
 * The simulator judges the plans: of those that give the tumour at least
 * 90 % of its dose, the best gives the most-dosed healthy spot the least;
 * within 5 points, the one that touches less healthy tissue wins (CRUK:
 * "sparing as much healthy tissue as possible").
 *
 * Settings: `beams` (N, 3..9), `gap` (degrees between same-side beams, 0..20).
 * Readings, for each plan p in one, angles, slide, side:
 *   p.target    the tumour's dose (%)
 *   p.healthy   the most any healthy spot gets (%)
 *   p.skin      the most any spot near the body's edge gets, where beams go in (%)
 *   p.area      share of healthy tissue that gets any real dose (0..1)
 *   best        the best plan: 0 one, 1 angles, 2 slide, 3 side
 *   beam.share  each spread-plan beam's share of the total strength (%)
 * Timeline values: the same p.target and p.healthy so far.
 *
 * Wrong models:
 *   one-beam-is-best       weak beams don't add up: a spot only feels its
 *                          strongest beam, so spread plans never reach the tumour
 *   same-side-is-gentlest  beams never overlap on the way in, so each healthy
 *                          spot gets one beam at most
 */

type Belief = "real" | "one-beam-is-best" | "same-side-is-gentlest";
export type PlanId = "one" | "angles" | "slide" | "side";
export const PLANS: readonly PlanId[] = ["one", "angles", "slide", "side"];

/** The body slice: an oval with half-widths A (across) and B (top to bottom). */
export const BODY = { a: 1, b: 0.72 } as const;
/** The tumour's radius, at the centre. */
export const TUMOUR_R = 0.16;
/** A beam's half-width, and its soft edge. */
export const BEAM_W = 0.16;
const EDGE = 0.04;
/** How fast a beam fades with depth (model value). */
const MU = 0.6;
/** Healthy tissue starts this far from the tumour's centre: past the edge zone where every beam still overlaps. */
const HEALTHY_FROM = 0.3;
/** Sub-beams that make up the sliding beam's two sweeps. */
const SLIDE_STEPS = 24;
const SLIDE_REACH = 0.85;

/** One beam: its direction (radians clockwise from the top), sideways offset, share of the total, and when it fires (0..1 of the run). */
export interface Beam {
  angle: number;
  offset: number;
  strength: number;
  from: number;
  to: number;
}

export interface BeamSettings {
  beams: number;
  gap: number;
}

export function beamSettings(def: ExperimentDef, build: Build): BeamSettings {
  return {
    beams: Math.round(numberSetting(def, build, "beams", 5, 3, 9)),
    gap: numberSetting(def, build, "gap", 10, 0, 20),
  };
}

/** The beams of each plan, in firing order. */
export function planBeams(plan: PlanId, { beams: n, gap }: BeamSettings): Beam[] {
  const slot = (i: number, count: number) => ({ from: i / count, to: (i + 1) / count });
  switch (plan) {
    case "one":
      return [{ angle: 0, offset: 0, strength: 1, from: 0, to: 1 }];
    case "angles":
      return Array.from({ length: n }, (_, i) => ({ angle: (i * 2 * Math.PI) / n, offset: 0, strength: 1 / n, ...slot(i, n) }));
    case "side":
      return Array.from({ length: n }, (_, i) => ({ angle: ((i - (n - 1) / 2) * gap * Math.PI) / 180, offset: 0, strength: 1 / n, ...slot(i, n) }));
    case "slide":
      // Two sweeps: left to right, then back.
      return Array.from({ length: SLIDE_STEPS }, (_, i) => {
        const half = SLIDE_STEPS / 2;
        const k = i < half ? i / (half - 1) : 1 - (i - half) / (half - 1);
        return { angle: 0, offset: -SLIDE_REACH + 2 * SLIDE_REACH * k, strength: 1 / SLIDE_STEPS, ...slot(i, SLIDE_STEPS) };
      });
  }
}

/** Where a beam enters the body, as a distance along its axis from the axis point nearest the centre (null if it misses). */
function entry(beam: Beam): number | null {
  const ux = Math.sin(beam.angle);
  const uy = Math.cos(beam.angle);
  const cx = beam.offset * uy;
  const cy = -beam.offset * ux;
  const qa = (ux / BODY.a) ** 2 + (uy / BODY.b) ** 2;
  const qb = 2 * ((cx * ux) / BODY.a ** 2 + (cy * uy) / BODY.b ** 2);
  const qc = (cx / BODY.a) ** 2 + (cy / BODY.b) ** 2 - 1;
  const disc = qb * qb - 4 * qa * qc;
  if (disc < 0) return null;
  return (-qb + Math.sqrt(disc)) / (2 * qa);
}

/** A beam's dose at (x, y) per unit of the total strength, before its share (model value; 1 = what the tumour needs from one beam from the top). */
export function beamKernel(beam: Beam, x: number, y: number): number {
  const enter = entry(beam);
  if (enter === null) return 0;
  const ux = Math.sin(beam.angle);
  const uy = Math.cos(beam.angle);
  // The axis point nearest the centre is offset × (uy, −ux).
  const dx = x - beam.offset * uy;
  const dy = y + beam.offset * ux;
  const along = dx * ux + dy * uy;
  const across = Math.abs(dx * uy - dy * ux);
  const depth = enter - along;
  if (depth < 0) return 0;
  const profile = across <= BEAM_W ? 1 : 1 - clamp((across - BEAM_W) / EDGE, 0, 1);
  return profile * Math.exp(-MU * (depth - BODY.b));
}

/** True when (x, y) lies inside the body slice. */
export function inBody(x: number, y: number): boolean {
  return (x / BODY.a) ** 2 + (y / BODY.b) ** 2 <= 1;
}

/** The healthy points the model checks: a grid over the body, outside the tumour. */
const HEALTHY: readonly (readonly [number, number])[] = (() => {
  const pts: [number, number][] = [];
  const step = 0.05;
  for (let x = -BODY.a; x <= BODY.a + 1e-9; x += step) {
    for (let y = -BODY.b; y <= BODY.b + 1e-9; y += step) {
      if (inBody(x, y) && Math.hypot(x, y) > HEALTHY_FROM) pts.push([x, y]);
    }
  }
  return pts;
})();

/** Healthy points near the body's edge (the outer fifth), where the beams go in. */
const SKIN = HEALTHY.map(([x, y]) => (x / BODY.a) ** 2 + (y / BODY.b) ** 2 >= 0.8 ** 2);

/** How much of each beam has fired by run fraction f (0..1). */
export function beamFired(beam: Beam, f: number): number {
  return clamp((f - beam.from) / (beam.to - beam.from), 0, 1);
}

interface PlanDose {
  target: number;
  healthy: number;
  skin: number;
  area: number;
}

function planModel(belief: Belief) {
  return (beams: Beam[]) => {
    const target = beams.map((b) => beamKernel(b, 0, 0) * b.strength);
    const healthy = HEALTHY.map(([x, y]) => beams.map((b) => beamKernel(b, x, y) * b.strength));
    return (f: number): PlanDose => {
      const fired = beams.map((b) => beamFired(b, f));
      // The tumour: doses add up where beams meet, unless the student thinks weak beams never add up.
      const tumourParts = target.map((d, i) => d * fired[i]);
      const t = belief === "one-beam-is-best" ? Math.max(0, ...tumourParts) : tumourParts.reduce((s, d) => s + d, 0);
      let most = 0;
      let skin = 0;
      let touched = 0;
      for (let h = 0; h < healthy.length; h++) {
        const parts = healthy[h];
        let sum = 0;
        let max = 0;
        for (let i = 0; i < parts.length; i++) {
          const d = parts[i] * fired[i];
          sum += d;
          if (d > max) max = d;
        }
        const dose = belief === "real" ? sum : max;
        if (dose > most) most = dose;
        if (SKIN[h] && dose > skin) skin = dose;
        if (dose > 0.05) touched++;
      }
      return { target: t * 100, healthy: most * 100, skin: skin * 100, area: touched / HEALTHY.length };
    };
  };
}

/** The simulator's verdict on the plans: index into PLANS. */
export function bestPlan(doses: readonly PlanDose[]): number {
  const reach = doses.map((d, i) => ({ ...d, i })).filter((d) => d.target >= 90);
  if (reach.length === 0) return doses.reduce((best, d, i) => (d.target > doses[best].target ? i : best), 0);
  reach.sort((x, y) => x.healthy - y.healthy);
  const close = reach.filter((d) => d.healthy - reach[0].healthy < 5);
  close.sort((x, y) => x.area - y.area || x.healthy - y.healthy);
  return close[0].i;
}

function beamsModel(belief: Belief): Simulate {
  return (def, build) => {
    const settings = beamSettings(def, build);
    const dose = planModel(belief);
    const plans = PLANS.map((p) => dose(planBeams(p, settings)));
    const end = plans.map((at) => at(1));
    const readings: Record<string, number> = {
      best: bestPlan(end),
      "beam.share": 100 / settings.beams,
    };
    PLANS.forEach((p, i) => {
      readings[`${p}.target`] = end[i].target;
      readings[`${p}.healthy`] = end[i].healthy;
      readings[`${p}.skin`] = end[i].skin;
      readings[`${p}.area`] = end[i].area;
    });
    const timeline = makeTimeline((t) => {
      const f = t / RUN_SECONDS;
      const values: Record<string, number> = {};
      PLANS.forEach((p, i) => {
        const d = plans[i](f);
        values[`${p}.target`] = d.target;
        values[`${p}.healthy`] = d.healthy;
      });
      return values;
    });
    return { readings, faults: [], timeline };
  };
}

export const simulateBeams: Simulate = beamsModel("real");

export const beamsWrongModels: Record<string, Simulate> = {
  "one-beam-is-best": beamsModel("one-beam-is-best"),
  "same-side-is-gentlest": beamsModel("same-side-is-gentlest"),
};
