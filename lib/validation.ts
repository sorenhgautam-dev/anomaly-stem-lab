import { beamsWrongModels, simulateBeams } from "@/engine/cancer/beams";
import { cellsWrongModels, simulateCells } from "@/engine/cancer/cells";
import { chemoWrongModels, simulateChemo } from "@/engine/cancer/chemo";
import { inheritWrongModels, simulateInherit } from "@/engine/cancer/inherit";
import { simulateTumour, tumourWrongModels } from "@/engine/cancer/tumour";
import { simulateUv, uvWrongModels } from "@/engine/cancer/uv";
import type { Build, ExperimentDef, PropValue } from "@/engine/types";

/*
 * Validation checks (CLAUDE.md §E): each teaching model behaves the way its
 * cited sources describe. The same checks run in vitest
 * (tests/validation/) and on /science, where each result is computed when
 * the page is built, never written by hand. Each title says in one sentence
 * what the check proves; `citations` names the claims it stands on.
 */

export interface ValidationCheck {
  experiment: string;
  title: string;
  citations: string[];
  run: () => boolean;
}

const def = { id: "validation", controls: [] } as unknown as ExperimentDef;
const build = (settings: Record<string, PropValue> = {}): Build => ({ experimentId: "validation", parts: [], connections: [], settings });

export const VALIDATION: ValidationCheck[] = [
  {
    experiment: "Why chemo causes hair loss",
    title: "Chemo affects fast-dividing cells (cancer and hair follicles) far more than slow-dividing cells.",
    citations: ["chemo-acts-on-dividing-cells-cruk", "chemo-affects-healthy-fast-cells"],
    run: () => {
      const r = simulateChemo(def, build()).readings;
      return 100 - r["hair.min"] > 20 && 100 - r["slow.min"] < 3 && r["cancer.end"] < 60;
    },
  },
  {
    experiment: "Why chemo causes hair loss",
    title: "Healthy fast-dividing cells recover after treatment stops.",
    citations: ["side-effects-often-temporary-cruk", "hair-usually-grows-back-acs"],
    run: () => {
      const r = simulateChemo(def, build({ length: "short" })).readings;
      return r["hair.end"] > r["hair.min"] + 15;
    },
  },
  {
    experiment: "Why chemo causes hair loss",
    title: "The wrong idea 'chemo only touches cancer' leaves the hair cells untouched, so the simulator can tell it apart.",
    citations: ["chemo-affects-healthy-fast-cells"],
    run: () => {
      const r = chemoWrongModels["chemo-targets-only-cancer"](def, build()).readings;
      return r["hair.early"] === 0 && Math.abs(100 - r["hair.min"]) < 0.5;
    },
  },
  {
    experiment: "How tumours grow",
    title: "Doubling gives exponential growth: after 15 doublings there are 2^15 times as many cells.",
    citations: ["cells-divide-in-two", "cancer-cells-keep-doubling-cruk"],
    run: () => {
      const tl = simulateTumour(def, build({ doubling: 2, months: 30 })).timeline!;
      const first = tl[0].values.cells;
      return Math.abs(tl[tl.length - 1].values.cells / first - 2 ** 15) < 1e-6 * 2 ** 15;
    },
  },
  {
    experiment: "How tumours grow",
    title: "A doubling cluster stays tiny for a long time, then grows fast: the second half adds far more than the first.",
    citations: ["cancer-cells-keep-doubling-cruk"],
    run: () => simulateTumour(def, build({ doubling: 2, months: 30 })).readings["growth.ratio"] > 100,
  },
  {
    experiment: "How tumours grow",
    title: "The wrong idea 'it grows steadily' adds the same amount in each half of the watch.",
    citations: [],
    run: () => Math.abs(tumourWrongModels["tumour-grows-steadily"](def, build()).readings["growth.ratio"] - 1) < 1e-6,
  },
  {
    experiment: "Cells out of control",
    title: "Crowded normal cells stop dividing once the dish is full.",
    citations: ["normal-cells-stop-when-needed-cruk"],
    run: () => {
      const r = simulateCells(def, build({ scene: "fill" })).readings;
      return r["normal.end"] <= r["normal.room"] && r["normal.afterFull"] < r["normal.room"] * 0.05;
    },
  },
  {
    experiment: "Cells out of control",
    title: "Cancer cells ignore the stop signal and keep dividing past the dish's room.",
    citations: ["cancer-cells-ignore-stop-signals"],
    run: () => {
      const r = simulateCells(def, build({ scene: "fill" })).readings;
      return r["cancer.count"] > r["normal.room"] * 2;
    },
  },
  {
    experiment: "Can you catch cancer?",
    title: "In the contact test nothing crosses to the other dish, after a short or a long touch: cancer isn't caught.",
    citations: ["cancer-not-contagious", "cancer-not-contagious-acs"],
    run: () => simulateCells(def, build({ scene: "contact" })).readings["spread.end"] === 0 && simulateCells(def, build({ scene: "contact", touch: "long" })).readings["spread.end"] === 0,
  },
  {
    experiment: "Can you catch cancer?",
    title: "The wrong idea 'cancer is catching' sends cells across at once, so the simulator can tell it apart.",
    citations: [],
    run: () => cellsWrongModels["cancer-is-contagious"](def, build({ scene: "contact" })).readings["spread.early"] > 0,
  },
  {
    experiment: "UV on a cloudy day",
    title: "Cloud cover reduces UV but never removes it.",
    citations: ["uv-through-clouds"],
    run: () => [0, 30, 60, 100].every((cloud) => {
      const share = simulateUv(def, build({ cloud })).readings["uv.share"];
      return share > 0.25 && share <= 1;
    }),
  },
  {
    experiment: "UV on a cloudy day",
    title: "Ordinary cloud lets over 90% of the UV through, and even full cover lets most through.",
    citations: ["uv-through-clouds-cruk"],
    run: () => simulateUv(def, build({ cloud: 60 })).readings["uv.share"] > 0.9 && simulateUv(def, build({ cloud: 100 })).readings["uv.share"] > 0.6,
  },
  {
    experiment: "UV on a cloudy day",
    title: "Damage to skin cells adds up with time in the UV, and sun protection cuts it.",
    citations: ["uv-damages-skin-cells", "sun-protection-reduces-risk"],
    run: () => {
      const short = simulateUv(def, build({ minutes: 30 })).readings["damage.end"];
      const long = simulateUv(def, build({ minutes: 90 })).readings["damage.end"];
      const covered = simulateUv(def, build({ protection: true })).readings["damage.end"];
      const bare = simulateUv(def, build()).readings["damage.end"];
      return Math.abs(long - short * 3) < 1e-6 && covered < bare / 2;
    },
  },
  {
    experiment: "UV on a cloudy day",
    title: "The wrong idea 'clouds block UV' lets almost none through, so the simulator can tell it apart.",
    citations: [],
    run: () => uvWrongModels["clouds-block-uv"](def, build({ cloud: 60 })).readings["uv.share"] < 0.2,
  },
  {
    experiment: "Radiotherapy beams",
    title: "Where beams from different angles meet, their doses add up: the tumour gets about as much from five weaker beams as from one strong beam.",
    citations: ["radiotherapy-beams-meet"],
    run: () => {
      const r = simulateBeams(def, build({ beams: 5 })).readings;
      return r["angles.target"] >= 90 && r["angles.target"] > 4 * r["beam.share"];
    },
  },
  {
    experiment: "Radiotherapy beams",
    title: "One strong beam also gives the healthy tissue on its path a high dose, more than the tumour gets.",
    citations: ["radiotherapy-healthy-tissue"],
    run: () => {
      const r = simulateBeams(def, build()).readings;
      return r["one.healthy"] > r["one.target"];
    },
  },
  {
    experiment: "Radiotherapy beams",
    title: "Spreading the beams all around gives each healthy spot much less than one strong beam, so the spread plan is judged best with 3 to 9 beams.",
    citations: ["radiotherapy-several-angles", "radiotherapy-planned-cruk"],
    run: () => [3, 4, 5, 6, 7, 8, 9].every((beams) => {
      const r = simulateBeams(def, build({ beams })).readings;
      return r.best === 1 && r["angles.healthy"] < r["one.healthy"] / 2;
    }),
  },
  {
    experiment: "Radiotherapy beams",
    title: "Spreading the dose across more beams (3, then 5, then 9) gives each path less where the beams go in.",
    citations: ["radiotherapy-beams-meet"],
    run: () => {
      const skin = [3, 5, 9].map((beams) => simulateBeams(def, build({ beams })).readings["angles.skin"]);
      return skin.every((d, i) => i === 0 || d < skin[i - 1]);
    },
  },
  {
    experiment: "Radiotherapy beams",
    title: "The wrong idea 'weak beams don't add up' picks one strong beam, so the simulator can tell it apart.",
    citations: [],
    run: () => beamsWrongModels["one-beam-is-best"](def, build()).readings.best === 0,
  },
  {
    experiment: "Born with it?",
    title: "With or without a change from birth, and with fewer or more exposures, most of a cell line's changes appear during life.",
    citations: ["genes-inherited-or-acquired", "most-changes-during-life"],
    run: () =>
      [true, false].every((inherited) =>
        ["less", "more"].every((exposure) => simulateInherit(def, build({ inherited, exposure })).readings["share.life"] >= 0.6),
      ),
  },
  {
    experiment: "Born with it?",
    title: "A change from birth is a head start: the cell line reaches its five changes sooner, but still needs changes during life.",
    citations: ["genes-inherited-or-acquired"],
    run: () => {
      const withIt = simulateInherit(def, build({ inherited: true, exposure: "more" })).readings;
      const without = simulateInherit(def, build({ inherited: false, exposure: "more" })).readings;
      return withIt["threshold.at"] < without["threshold.at"] && withIt["changes.life"] >= 4;
    },
  },
  {
    experiment: "Born with it?",
    title: "Fewer everyday exposures mean fewer changes during life.",
    citations: ["most-changes-during-life"],
    run: () => simulateInherit(def, build({ exposure: "less" })).readings["changes.life"] < simulateInherit(def, build({ exposure: "more" })).readings["changes.life"],
  },
  {
    experiment: "Born with it?",
    title: "The wrong idea 'cancer is mostly passed down' puts most changes at birth, so the simulator can tell it apart.",
    citations: [],
    run: () => inheritWrongModels["cancer-is-mostly-inherited"](def, build()).readings["share.life"] <= 0.4,
  },
];

/** Every check, run now. */
export function validationResults(): (ValidationCheck & { pass: boolean })[] {
  return VALIDATION.map((c) => {
    let pass = false;
    try {
      pass = c.run();
    } catch {
      pass = false;
    }
    return { ...c, pass };
  });
}
