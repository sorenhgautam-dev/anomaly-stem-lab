import type { Build, ExperimentDef, Simulate } from "../types";
import { booleanSetting, choiceSetting, makeTimeline, RUN_SECONDS } from "../chemistry/common";

/*
 * Stage "inherit": where the changes that lead to cancer come from
 * (experiment "Born with it?", CLAUDE.md §3.6). A teaching model of one cell
 * line over a lifetime. Changes build up in it over time; once it has
 * NEEDED changes it stops following the rules. Changes come from three
 * places (NCI: gene changes "can be inherited or arise from certain
 * environmental exposures", and "can also happen because of errors that
 * occur as cells divide"):
 *   inherited  one change present from birth (if switched on)
 *   copy       copying errors as cells divide, spread over the lifetime
 *   exposure   everyday exposures, more or fewer
 * With an inherited change the cell line starts one step ahead, so it may
 * reach the threshold sooner, but most changes still appear during life.
 * Life runs from 0 (birth) to 1 (older age): model values, never ages.
 *
 * Settings: `inherited` (on or off), `exposure` ("less" or "more").
 * Readings:
 *   changes.inherited  changes present from birth
 *   changes.life       changes that appeared during life, up to the
 *                      threshold (or to the end of life if never reached)
 *   share.life         changes.life as a share of all those changes (0..1)
 *   threshold.at       life fraction when the threshold was reached (2 if never)
 *   causes.unknown     changes with no cause at all (always 0 here)
 * Timeline values: life (0..1), inherited, copy, exposure, during (copy +
 *   exposure), total (counts so far, up to the threshold), broken (1 once the cell line has stopped following the rules).
 *
 * Wrong model:
 *   cancer-is-mostly-inherited  the family passes down most of the changes
 *                               (NEEDED − 1 of them); life adds only one more
 */

type Belief = "real" | "cancer-is-mostly-inherited";

/** Changes a cell line needs before it stops following the rules (model value). */
export const NEEDED = 5;

/** Copying errors per lifetime, and everyday exposures per lifetime (model values). */
const COPY_RATE = 2.5;
const EXPOSURE_RATE = { less: 1.5, more: 3.5 } as const;

export interface Change {
  at: number;
  cause: "inherited" | "copy" | "exposure";
}

/** Evenly spaced arrivals at `rate` per lifetime, before the end of life. */
function arrivals(rate: number, cause: Change["cause"]): Change[] {
  const out: Change[] = [];
  for (let k = 1; k / rate < 1; k++) out.push({ at: k / rate, cause });
  return out;
}

/** Every change in the cell line's life, in order. */
export function lifeChanges(belief: Belief, inherited: boolean, exposure: "less" | "more"): Change[] {
  if (belief === "cancer-is-mostly-inherited") {
    // The family hands down nearly everything; one change arrives in life.
    const born: Change[] = inherited ? Array.from({ length: NEEDED - 1 }, () => ({ at: 0, cause: "inherited" as const })) : [];
    return [...born, { at: 0.5, cause: "exposure" }];
  }
  const born: Change[] = inherited ? [{ at: 0, cause: "inherited" }] : [];
  const life = [...arrivals(COPY_RATE, "copy"), ...arrivals(EXPOSURE_RATE[exposure], "exposure")].sort((a, b) => a.at - b.at);
  return [...born, ...life];
}

export function inheritSettings(def: ExperimentDef, build: Build): { inherited: boolean; exposure: "less" | "more" } {
  return {
    inherited: booleanSetting(def, build, "inherited", true),
    exposure: choiceSetting(def, build, "exposure", ["less", "more"], "more") as "less" | "more",
  };
}

function inheritModel(belief: Belief): Simulate {
  return (def, build) => {
    const { inherited, exposure } = inheritSettings(def, build);
    const changes = lifeChanges(belief, inherited, exposure);
    const thresholdAt = changes.length >= NEEDED ? changes[NEEDED - 1].at : 2;
    const counted = changes.filter((c) => c.at <= thresholdAt);
    const born = counted.filter((c) => c.cause === "inherited").length;
    const life = counted.length - born;
    const timeline = makeTimeline((t) => {
      const f = t / RUN_SECONDS;
      // Counts stop at the threshold: the changes that led the cell to stop following the rules (the readings count the same ones).
      const sofar = changes.filter((c) => c.at <= f && c.at <= thresholdAt);
      const count = (cause: Change["cause"]) => sofar.filter((c) => c.cause === cause).length;
      return {
        life: f,
        inherited: count("inherited"),
        copy: count("copy"),
        exposure: count("exposure"),
        during: count("copy") + count("exposure"),
        total: sofar.length,
        broken: f >= thresholdAt ? 1 : 0,
      };
    });
    return {
      readings: {
        "changes.inherited": born,
        "changes.life": life,
        "share.life": counted.length ? life / counted.length : 0,
        "threshold.at": thresholdAt,
        "causes.unknown": 0,
      },
      faults: [],
      timeline,
    };
  };
}

export const simulateInherit: Simulate = inheritModel("real");

export const inheritWrongModels: Record<string, Simulate> = {
  "cancer-is-mostly-inherited": inheritModel("cancer-is-mostly-inherited"),
};
