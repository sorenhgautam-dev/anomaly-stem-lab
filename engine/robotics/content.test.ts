import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { conflict } from "../conflict";
import { applyEdit, initialBuild, sameBuild } from "../edits";
import { matches } from "../match";
import { simulateOutcome } from "../outcome";
import { realModel, wrongModel } from "../registry";
import { holds } from "../rules";
import { runExperiment } from "../run";
import { experimentSchema, hintSchema, misconceptionSchema, theorySchema } from "../schema";
import { SLOT_LENGTH, type Build, type EditDef, type ExperimentDef, type Simulate } from "../types";

/*
 * Every robotics content file loads, validates, and tells a coherent story
 * with the engine: the real answer is one of the options, each misconception's
 * wrong model can be caught out by the allowed edits, and boards are tidy.
 */

const CONTENT = fileURLToPath(new URL("../../content/", import.meta.url));
const readJson = (path: string): unknown => JSON.parse(readFileSync(`${CONTENT}${path}`, "utf8"));

const EXPECTED: Record<string, { level: string; order: number; stage: string }> = {
  "robotics-light-bulb": { level: "easy", order: 1, stage: "circuit" },
  "robotics-switches": { level: "easy", order: 2, stage: "circuit" },
  "robotics-series": { level: "easy", order: 3, stage: "circuit" },
  "robotics-parallel": { level: "easy", order: 4, stage: "circuit" },
  "robotics-led": { level: "medium", order: 1, stage: "circuit" },
  "robotics-steering": { level: "medium", order: 2, stage: "robot" },
  "robotics-shortcut": { level: "medium", order: 3, stage: "circuit" },
  "robotics-ohms-law": { level: "advanced", order: 1, stage: "circuit" },
  "robotics-gears": { level: "advanced", order: 2, stage: "gears" },
  "robotics-pwm": { level: "advanced", order: 3, stage: "pwm" },
};

const files = readdirSync(`${CONTENT}experiments`).filter((f) => f.startsWith("robotics-") && f.endsWith(".json"));
const experiments: ExperimentDef[] = files.map((file) => {
  const parsed = experimentSchema.safeParse(readJson(`experiments/${file}`));
  if (!parsed.success) throw new Error(`${file}: ${parsed.error.message}`);
  expect(`${parsed.data.id}.json`).toBe(file);
  return parsed.data;
});

/** The starting build plus every build reachable with up to `depth` allowed edits. */
function reachable(def: ExperimentDef, depth = 2): Build[] {
  const seen = [initialBuild(def)];
  let frontier = seen;
  for (let d = 0; d < depth; d++) {
    const next: Build[] = [];
    for (const build of frontier) {
      for (const { edit } of def.allowedEdits) {
        const edited = applyEdit(build, edit);
        if (!seen.some((b) => sameBuild(b, edited))) {
          seen.push(edited);
          next.push(edited);
        }
      }
    }
    frontier = next;
  }
  return seen;
}

const answerOf = (def: ExperimentDef, build: Build, model: Simulate) => simulateOutcome(def, build, model).result;

function edited(def: ExperimentDef, ...ids: string[]): Build {
  return ids.reduce((build, id) => {
    const allowed = def.allowedEdits.find((e) => e.id === id);
    if (!allowed) throw new Error(`${def.id} has no edit "${id}"`);
    return applyEdit(build, allowed.edit);
  }, initialBuild(def));
}

describe("robotics experiments: catalogue", () => {
  it("has exactly the experiments the app links to, at the right level, order and stage", () => {
    expect(experiments.map((e) => e.id).sort()).toEqual(Object.keys(EXPECTED).sort());
    for (const def of experiments) {
      expect({ level: def.level, order: def.order, stage: def.stage }, def.id).toEqual(EXPECTED[def.id]);
      expect(def.lab).toBe("robotics");
    }
  });
});

describe.each(experiments.map((def) => [def.id, def] as const))("%s", (_id, def) => {
  const real = realModel(def.stage);

  it("runs its starting build through the whole loop without throwing", () => {
    for (const option of def.prediction.type === "choice" ? def.prediction.options : []) {
      const result = runExperiment(def, initialBuild(def), { type: "choice", value: option }, {});
      expect(["correct", "wrong"]).toContain(result.verdict);
    }
  });

  it("gives exactly one of its options as the real answer, for every reachable build", () => {
    if (def.prediction.type !== "choice") throw new Error("robotics experiments ask choice questions");
    const spec = def.prediction;
    for (const build of reachable(def)) {
      const result = answerOf(def, build, real);
      const hits = spec.options.filter((o) => matches(spec, { type: "choice", value: o }, result));
      expect(hits, JSON.stringify(build.settings)).toHaveLength(1);
    }
  });

  it("has text, hints and a wrong model for each misconception, and a theory page", () => {
    expect(def.misconceptions.length).toBeGreaterThan(0);
    for (const id of def.misconceptions) {
      const text = misconceptionSchema.parse(readJson(`misconceptions/${id}.json`));
      expect(text.id).toBe(id);
      expect(text.lab).toBe("robotics");
      expect(hintSchema.parse(readJson(`hints/${id}.json`)).misconceptionId).toBe(id);
      expect(wrongModel(id), id).toBeDefined();
    }
    expect(theorySchema.parse(readJson(`theory/${def.theoryId}.json`)).id).toBe(def.theoryId);
  });

  it("lets every misconception be caught: some reachable build where belief and reality disagree", () => {
    for (const id of def.misconceptions) {
      const belief = wrongModel(id);
      if (!belief) throw new Error(id);
      const split = reachable(def).some(
        (b) => answerOf(def, b, belief).value !== answerOf(def, b, real).value,
      );
      expect(split, id).toBe(true);
    }
  });

  it("offers a conflict edit that separates each belief from reality", () => {
    for (const id of def.misconceptions) {
      const separating = reachable(def, 1).some((b) => {
        const c = conflict(def, b, id);
        return c !== null && c.realAnswer.value !== c.beliefAnswer.value;
      });
      expect(separating, id).toBe(true);
    }
  });

  it("has a goal that some reachable build meets", () => {
    const goal = def.goalCondition;
    if (!goal) return;
    expect(reachable(def).some((b) => holds(goal, simulateOutcome(def, b, real)))).toBe(true);
  });

  it("only uses edits that fit the experiment's slots and controls", () => {
    const slots = new Map((def.board?.slots ?? []).map((s) => [s.id, s]));
    const check = (edit: EditDef) => {
      switch (edit.op) {
        case "place":
          expect(slots.get(edit.slot)?.accepts, edit.slot).toContain(edit.kind);
          break;
        case "remove":
        case "toggle-prop":
          expect(slots.has(edit.slot), edit.slot).toBe(true);
          break;
        case "set": {
          const control = def.controls?.find((c) => c.id === edit.setting);
          expect(control?.type, edit.setting).toBe("slider");
          if (control?.type === "slider" && typeof edit.value === "number") {
            expect(edit.value).toBeGreaterThanOrEqual(control.min);
            expect(edit.value).toBeLessThanOrEqual(control.max);
            expect(Number.isInteger((edit.value - control.min) / control.step)).toBe(true);
          }
          break;
        }
        default:
          break;
      }
    };
    for (const allowed of def.allowedEdits) check(allowed.edit);
    for (const control of def.controls ?? []) {
      if (control.type === "slider") {
        expect(Number.isInteger((control.initial - control.min) / control.step), control.id).toBe(true);
      }
    }
  });
});

describe("robotics experiments: the story each one tells", () => {
  const byId = (id: string) => {
    const def = experiments.find((e) => e.id === id);
    if (!def) throw new Error(id);
    return def;
  };
  const say = (id: string, build: Build | null, model?: string) => {
    const def = byId(id);
    const sim = model ? wrongModel(model) : realModel(def.stage);
    if (!sim) throw new Error(model);
    return answerOf(def, build ?? initialBuild(def), sim).value;
  };

  it("light-bulb: one wire isn't a circuit", () => {
    const id = "robotics-light-bulb";
    expect(say(id, null)).toBe("No");
    expect(say(id, null, "one-wire-enough")).toBe("Yes");
    expect(say(id, edited(byId(id), "add-second-wire"))).toBe("Yes");
  });

  it("switches: an open switch after the bulb still breaks the loop", () => {
    const id = "robotics-switches";
    expect(say(id, null)).toBe("No");
    expect(say(id, null, "switch-only-positive")).toBe("Yes");
    expect(say(id, edited(byId(id), "flip-switch"))).toBe("Yes");
  });

  it("series: identical bulbs in one loop glow the same", () => {
    const id = "robotics-series";
    expect(say(id, null)).toBe("Both the same");
    expect(say(id, null, "current-used-up")).toBe("Bulb A");
    expect(say(id, edited(byId(id), "flip-battery"), "current-used-up")).toBe("Bulb B");
    expect(say(id, edited(byId(id), "flip-battery"))).toBe("Both the same");
  });

  it("parallel: a second branch leaves bulb A as bright", () => {
    const id = "robotics-parallel";
    const withB = edited(byId(id), "add-bulb-b");
    expect(say(id, withB)).toBe("The same");
    expect(say(id, withB, "battery-constant-current")).toBe("Dimmer");
    expect(say(id, edited(byId(id), "add-bulb-b", "add-bulb-c"))).toBe("The same");
  });

  it("led: polarity and a current-limiting resistor both matter", () => {
    const id = "robotics-led";
    const def = byId(id);
    expect(say(id, null)).toBe("Stay dark");
    expect(say(id, edited(def, "add-resistor"))).toBe("Stay dark");
    expect(say(id, edited(def, "add-resistor"), "led-any-direction")).toBe("Glow");
    expect(say(id, edited(def, "flip-led", "add-resistor"))).toBe("Glow");
    expect(say(id, edited(def, "flip-led", "use-wire"))).toBe("Burn out");
    expect(say(id, edited(def, "flip-led", "use-wire"), "no-resistor-needed")).toBe("Glow");
  });

  it("steering: a faster right wheel turns the robot left", () => {
    const id = "robotics-steering";
    expect(say(id, null)).toBe("Left");
    expect(say(id, null, "turns-toward-faster-wheel")).toBe("Right");
    expect(say(id, edited(byId(id), "left-100"))).toBe("Right");
    expect(say(id, edited(byId(id), "right-30"))).toBe("Straight");
  });

  it("shortcut: a wire across bulb B makes bulb A brighter", () => {
    const id = "robotics-shortcut";
    const shorted = edited(byId(id), "add-shortcut");
    expect(say(id, null)).toBe("Stay the same");
    expect(say(id, shorted)).toBe("Get brighter");
    expect(say(id, shorted, "short-harmless")).toBe("Stay the same");
  });

  it("ohms-law: on a fixed voltage the small resistor runs hottest", () => {
    const id = "robotics-ohms-law";
    const def = byId(id);
    expect(say(id, null)).toBe("Overheat");
    expect(say(id, null, "more-resistance-more-heat")).toBe("Stay cool");
    expect(say(id, edited(def, "use-470"))).toBe("Get warm");
    expect(say(id, edited(def, "use-1k"))).toBe("Stay cool");
    expect(say(id, edited(def, "use-1k"), "more-resistance-more-heat")).toBe("Overheat");
  });

  it("gears: a big output gear turns slower", () => {
    const id = "robotics-gears";
    expect(say(id, null)).toBe("Slower than the motor");
    expect(say(id, null, "big-gear-faster")).toBe("Faster than the motor");
    expect(say(id, null, "gears-keep-speed")).toBe("At the same speed");
    expect(say(id, edited(byId(id), "small-output"))).toBe("Faster than the motor");
    expect(say(id, edited(byId(id), "big-motor-gear", "equal-gears"))).toBe("Faster than the motor");
  });

  it("pwm: half duty spins the motor smoothly at a lower speed", () => {
    const id = "robotics-pwm";
    expect(say(id, null)).toBe("Spin smoothly at a lower speed");
    expect(say(id, null, "pwm-stutters")).toBe("Stutter on and off");
    expect(say(id, null, "pwm-full-speed")).toBe("Spin at full speed");
    expect(say(id, edited(byId(id), "duty-100"))).toBe("Spin at full speed");
  });
});

// ---------------------------------------------------------------------------
// Board layout: the UI draws boards straight from the JSON.
// ---------------------------------------------------------------------------

interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  what: string;
}

const BOUNDS = { minX: 80, maxX: 920, minY: 70, maxY: 530 };
const MIN_GAP = 40;

function terminalPoint(def: ExperimentDef, terminal: string): [number, number] {
  const [slotId, end] = terminal.split(".");
  const slot = def.board?.slots.find((s) => s.id === slotId);
  if (!slot) throw new Error(`${def.id}: no slot for ${terminal}`);
  const half = (end === "a" ? -1 : 1) * (SLOT_LENGTH / 2);
  return slot.orientation === "h" ? [slot.x + half, slot.y] : [slot.x, slot.y + half];
}

function segments(def: ExperimentDef): { segs: Seg[]; terminals: Set<string> } {
  const segs: Seg[] = [];
  const terminals = new Set<string>();
  for (const slot of def.board?.slots ?? []) {
    const [x1, y1] = terminalPoint(def, `${slot.id}.a`);
    const [x2, y2] = terminalPoint(def, `${slot.id}.b`);
    segs.push({ x1, y1, x2, y2, what: `slot ${slot.id}` });
    terminals.add(`${x1},${y1}`).add(`${x2},${y2}`);
  }
  for (const wire of def.board?.wires ?? []) {
    const points = [terminalPoint(def, wire.from), ...(wire.via ?? []), terminalPoint(def, wire.to)];
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i - 1];
      const [x2, y2] = points[i];
      segs.push({ x1, y1, x2, y2, what: `wire ${wire.from}→${wire.to} #${i}` });
    }
  }
  return { segs, terminals };
}

const span = (a: number, b: number): [number, number] => [Math.min(a, b), Math.max(a, b)];
const overlap = ([a1, a2]: [number, number], [b1, b2]: [number, number]) => Math.min(a2, b2) - Math.max(a1, b1);

/** Problems between two axis-aligned segments, or null if they sit together tidily. */
function clash(s: Seg, t: Seg, terminals: Set<string>): string | null {
  const sh = s.y1 === s.y2;
  const th = t.y1 === t.y2;
  if (sh === th) {
    const [sCross, tCross] = sh ? [s.y1, t.y1] : [s.x1, t.x1];
    const along = sh
      ? overlap(span(s.x1, s.x2), span(t.x1, t.x2))
      : overlap(span(s.y1, s.y2), span(t.y1, t.y2));
    if (sCross === tCross && along > 0) return "overlap";
    if (sCross !== tCross && along > 0 && Math.abs(sCross - tCross) < MIN_GAP) return "too close";
    return null;
  }
  const [h, v] = sh ? [s, t] : [t, s];
  const [hx1, hx2] = span(h.x1, h.x2);
  const [vy1, vy2] = span(v.y1, v.y2);
  if (v.x1 < hx1 || v.x1 > hx2 || h.y1 < vy1 || h.y1 > vy2) return null;
  const point = `${v.x1},${h.y1}`;
  const endOf = (seg: Seg) => `${seg.x1},${seg.y1}` === point || `${seg.x2},${seg.y2}` === point;
  const sameWire = s.what.split(" #")[0] === t.what.split(" #")[0];
  if (endOf(h) && endOf(v) && (terminals.has(point) || sameWire)) return null;
  return `cross at ${point}`;
}

describe.each(experiments.filter((d) => d.board).map((def) => [def.id, def] as const))("%s board", (_id, def) => {
  const { segs, terminals } = segments(def);

  it("keeps every slot and wire inside the drawing area", () => {
    for (const s of segs) {
      for (const [x, y] of [
        [s.x1, s.y1],
        [s.x2, s.y2],
      ]) {
        expect(x, s.what).toBeGreaterThanOrEqual(BOUNDS.minX);
        expect(x, s.what).toBeLessThanOrEqual(BOUNDS.maxX);
        expect(y, s.what).toBeGreaterThanOrEqual(BOUNDS.minY);
        expect(y, s.what).toBeLessThanOrEqual(BOUNDS.maxY);
      }
    }
  });

  it("draws wires as horizontal and vertical runs only", () => {
    for (const s of segs) {
      const straight = (s.x1 === s.x2) !== (s.y1 === s.y2);
      expect(straight, `${s.what} (${s.x1},${s.y1})→(${s.x2},${s.y2})`).toBe(true);
    }
  });

  it("never overlaps, crosses or crowds wires and parts", () => {
    const problems: string[] = [];
    for (let i = 0; i < segs.length; i++) {
      for (let j = i + 1; j < segs.length; j++) {
        const problem = clash(segs[i], segs[j], terminals);
        if (problem) problems.push(`${segs[i].what} / ${segs[j].what}: ${problem}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("puts the battery on the left, vertical, + on top", () => {
    const battery = def.board?.slots.find((s) => s.fixed?.kind === "battery");
    expect(battery?.orientation).toBe("v");
    expect(battery?.x).toBeLessThan(250);
    expect(battery?.fixed?.props?.flipped ?? false).toBe(false);
  });
});

describe("robotics misconception, hint and theory files", () => {
  it("covers every robotics misconception with a hint ladder, and every file validates", () => {
    const used = new Set(experiments.flatMap((e) => e.misconceptions));
    for (const id of used) expect(existsSync(`${CONTENT}hints/${id}.json`), id).toBe(true);
    const theories = new Set(experiments.map((e) => e.theoryId));
    for (const id of theories) expect(existsSync(`${CONTENT}theory/${id}.json`), id).toBe(true);
    expect(used.size).toBe(13);
    expect(theories.size).toBe(10);
  });

  it("lists the sources each theory page was checked against (RESOURCES.md §6)", () => {
    for (const id of new Set(experiments.map((e) => e.theoryId))) {
      const theory = theorySchema.parse(readJson(`theory/${id}.json`));
      expect(theory.sources?.length ?? 0, id).toBeGreaterThan(0);
      expect(theory.body.length, id).toBeLessThanOrEqual(4);
    }
  });
});
