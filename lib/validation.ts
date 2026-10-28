import { cellsWrongModels, simulateCells } from "@/engine/cancer/cells";
import { chemoWrongModels, simulateChemo } from "@/engine/cancer/chemo";
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
