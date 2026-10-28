import type { Simulate } from "../types";
import { booleanSetting, choiceSetting, makeTimeline, RUN_SECONDS } from "../chemistry/common";

/*
 * Stage "chemo": why chemotherapy can cause hair loss (experiment "Why chemo
 * causes hair loss", CLAUDE.md §3.1). A teaching model, not a medical one:
 * every number is a model value, never a real dose, rate or time.
 *
 * Three cell groups sit in their own dishes: cancer cells (divide fast),
 * hair follicle cells (divide fast) and a slow-dividing kind (like nerve or
 * muscle cells). Chemotherapy acts mainly on cells while they divide, so in
 * any moment of treatment a group loses cells in proportion to how fast it
 * divides. Healthy groups renew back toward where they started; the cancer
 * group grows when it isn't being treated.
 *
 * Settings: `chemo` (on or off), `length` ("short" or "long" treatment),
 *   `cancerRate` ("fast" or "slow" dividing cancer, for What if?).
 * Readings (all "% of the start", model values):
 *   cancer.end, hair.min, hair.end, slow.min
 *   hair.early   how far hair cells had dropped a third of the way into
 *                treatment (0 when they hadn't)
 *   hair.peak    the highest the hair cells went
 *   treat.start, treat.end   when treatment ran, in display seconds
 * Timeline values: cancer, hair, slow (% of the start), chemo (1 while on).
 *
 * Wrong models:
 *   chemo-targets-only-cancer   chemo acts on cancer cells only: the hair
 *                               cells never change
 *   chemo-hits-healthy-last     healthy cells feel nothing until the cancer
 *                               is mostly gone, then drop at the very end
 */

type Belief = "real" | "chemo-targets-only-cancer" | "chemo-hits-healthy-last";

/** How fast each group divides (share per model time unit). */
const DIVIDE = { cancerFast: 1, cancerSlow: 0.25, hair: 0.9, slow: 0.012 } as const;
/** How strongly treatment acts on a dividing cell. */
const HIT = 0.55;
/** How fast a healthy group renews toward where it started, per unit of its division rate (renewing is dividing). */
const RENEW = 0.4;
/** How fast the cancer group grows untreated. */
const GROW = 0.12;
const START = 2;
const LENGTH = { short: 3.5, long: 7 } as const;
const STEPS_PER_SECOND = 60;

function chemoModel(belief: Belief): Simulate {
  return (def, build) => {
    const on = booleanSetting(def, build, "chemo", true);
    const length = LENGTH[choiceSetting(def, build, "length", ["short", "long"], "short") as keyof typeof LENGTH];
    const cancerRate = choiceSetting(def, build, "cancerRate", ["fast", "slow"], "fast") === "slow" ? DIVIDE.cancerSlow : DIVIDE.cancerFast;
    const end = Math.min(RUN_SECONDS - 0.5, START + length);
    const treating = (t: number) => on && t >= START && t < end;

    // Step the three groups forward in small steps and keep every frame's values.
    const dt = 1 / STEPS_PER_SECOND;
    const states: { t: number; cancer: number; hair: number; slow: number }[] = [];
    let cancer = 100;
    let hair = 100;
    let slow = 100;
    let cancerGoneAt = Infinity;
    for (let i = 0; i <= RUN_SECONDS * STEPS_PER_SECOND; i++) {
      const t = i * dt;
      states.push({ t, cancer, hair, slow });
      const on = treating(t);
      if (on && cancer < 25 && cancerGoneAt === Infinity) cancerGoneAt = t;
      const healthyHit = belief === "real" ? on : belief === "chemo-hits-healthy-last" ? on && t >= Math.max(cancerGoneAt, end - 1.2) : false;
      cancer += (on ? -HIT * cancerRate * cancer : GROW * cancer * (1 - cancer / 160)) * dt;
      hair += (RENEW * DIVIDE.hair * (100 - hair) - (healthyHit ? HIT * DIVIDE.hair * hair : 0)) * dt;
      slow += (RENEW * DIVIDE.slow * (100 - slow) - (healthyHit ? HIT * DIVIDE.slow * slow : 0)) * dt;
    }
    const at = (t: number) => states[Math.min(states.length - 1, Math.max(0, Math.round(t * STEPS_PER_SECOND)))];

    const timeline = makeTimeline((t) => {
      const s = at(t);
      return { cancer: s.cancer, hair: s.hair, slow: s.slow, chemo: treating(t) ? 1 : 0 };
    });
    const early = START + (end - START) / 3;
    return {
      readings: {
        "cancer.end": at(RUN_SECONDS).cancer,
        "hair.min": Math.min(...states.map((s) => s.hair)),
        "hair.end": at(RUN_SECONDS).hair,
        "hair.early": on ? Math.max(0, 100 - at(early).hair) : 0,
        "hair.peak": Math.max(...states.map((s) => s.hair)),
        "slow.min": Math.min(...states.map((s) => s.slow)),
        "treat.start": on ? START : 0,
        "treat.end": on ? end : 0,
      },
      faults: [],
      timeline,
    };
  };
}

export const simulateChemo: Simulate = chemoModel("real");

export const chemoWrongModels: Record<string, Simulate> = {
  "chemo-targets-only-cancer": chemoModel("chemo-targets-only-cancer"),
  "chemo-hits-healthy-last": chemoModel("chemo-hits-healthy-last"),
};
