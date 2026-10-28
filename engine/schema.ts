import { z } from "zod";
import type {
  AnswerRule,
  Condition,
  EditDef,
  ExperimentDef,
  HintDef,
  MisconceptionDef,
  TheoryDef,
} from "./types";

/*
 * Zod schemas for everything under content/. Content is validated when it is
 * loaded (lib/content.ts) and in tests, so a typo in JSON fails loudly
 * instead of breaking an experiment at run time.
 */

const labId = z.enum(["cell", "prevention", "detection", "treatment", "chemistry", "robotics"]);
const levelId = z.enum(["easy", "medium", "advanced"]);
const grades = z.enum(["6-8", "9-10", "11-12"]);
const stageId = z.enum([
  "circuit",
  "robot",
  "gears",
  "pwm",
  "fizz",
  "dissolve",
  "heat",
  "rate",
  "melt",
  "indicator",
  "neutralise",
  "burn",
  "gaslaw",
  "catalyst",
  "equilibrium",
  "chemo",
  "tumour",
  "cells",
  "uv",
  "beams",
  "inherit",
]);
const partKind = z.enum(["battery", "wire", "switch", "resistor", "bulb", "led", "motor", "buzzer"]);
const propValue = z.union([z.number(), z.boolean(), z.string()]);
const props = z.record(z.string(), propValue);
const terminal = z.string().regex(/^[a-z0-9-]+\.(a|b)$/, 'terminal must look like "slot.a" or "slot.b"');

const slot = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  x: z.number(),
  y: z.number(),
  orientation: z.enum(["h", "v"]),
  accepts: z.array(partKind),
  fixed: z.object({ kind: partKind, props: props.optional() }).optional(),
  initial: z.object({ kind: partKind, props: props.optional() }).optional(),
});

const board = z.object({
  slots: z.array(slot).min(1),
  wires: z.array(
    z.object({
      from: terminal,
      to: terminal,
      via: z.array(z.tuple([z.number(), z.number()])).optional(),
    }),
  ),
});

const control = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("toggle"),
    id: z.string(),
    label: z.string(),
    onLabel: z.string(),
    offLabel: z.string(),
    initial: z.boolean(),
  }),
  z.object({
    type: z.literal("slider"),
    id: z.string(),
    label: z.string(),
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    unit: z.string(),
    initial: z.number(),
  }),
  z.object({
    type: z.literal("choice"),
    id: z.string(),
    label: z.string(),
    options: z.array(z.object({ value: z.string(), label: z.string() })).min(2),
    initial: z.string(),
  }),
]);

const predictionSpec = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("choice"),
    question: z.string(),
    options: z.array(z.string()).min(2),
  }),
  z.object({
    type: z.literal("slider"),
    question: z.string(),
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    unit: z.string().optional(),
    tolerance: z.number().nonnegative(),
  }),
]);

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({
      reading: z.string(),
      op: z.enum([">", ">=", "<", "<=", "==", "!="]),
      value: z.number(),
    }),
    z.object({ fault: z.string() }),
    z.object({ all: z.array(conditionSchema) }),
    z.object({ any: z.array(conditionSchema) }),
    z.object({ not: conditionSchema }),
  ]),
);

export const answerRuleSchema: z.ZodType<AnswerRule> = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("cases"),
    cases: z.array(z.object({ when: conditionSchema, answer: z.string() })).min(1),
    otherwise: z.string(),
  }),
  z.object({
    kind: z.literal("compare"),
    a: z.string(),
    b: z.string(),
    tolerance: z.number().nonnegative(),
    aBigger: z.string(),
    bBigger: z.string(),
    same: z.string(),
  }),
  z.object({
    kind: z.literal("change"),
    reading: z.string(),
    tolerance: z.number().nonnegative(),
    up: z.string(),
    down: z.string(),
    same: z.string(),
    zero: z.string().optional(),
  }),
  z.object({ kind: z.literal("value"), reading: z.string() }),
]);

/** One small change to a build (EditDef). Also used by content/what-if.json. */
export const editDef: z.ZodType<EditDef> = z.discriminatedUnion("op", [
  z.object({ op: z.literal("toggle-prop"), slot: z.string(), prop: z.string() }),
  z.object({ op: z.literal("place"), slot: z.string(), kind: partKind, props: props.optional() }),
  z.object({ op: z.literal("remove"), slot: z.string() }),
  z.object({ op: z.literal("connect"), from: terminal, to: terminal }),
  z.object({ op: z.literal("disconnect"), from: terminal, to: terminal }),
  z.object({ op: z.literal("set"), setting: z.string(), value: propValue }),
]);

export const experimentSchema: z.ZodType<ExperimentDef> = z
  .object({
    id: z.string().regex(/^(robotics|chemistry|cell|prevention|detection|treatment)-[a-z0-9-]+$/),
    lab: labId,
    level: levelId,
    grades,
    order: z.number().int().min(1),
    title: z.string().min(1),
    goal: z.string().min(1),
    intro: z.string().min(1),
    minutes: z.number().min(1).max(10),
    stage: stageId,
    parts: z.array(partKind),
    outlines: z.boolean(),
    board: board.optional(),
    controls: z.array(control).optional(),
    prediction: predictionSpec,
    answer: answerRuleSchema,
    goalCondition: conditionSchema.optional(),
    misconceptions: z.array(z.string()),
    allowedEdits: z.array(z.object({ id: z.string(), label: z.string(), edit: editDef })),
    theoryId: z.string(),
    safety: z.string().optional(),
    citationIds: z.array(z.string().regex(/^[a-z0-9-]+$/)).optional(),
    tryAtHome: z.object({ title: z.string().min(1), steps: z.array(z.string().min(1)).min(1), watch: z.string().min(1), safety: z.string().min(1) }).optional(),
    heroSlide: z.number().int().min(1).max(3).optional(),
  })
  .superRefine((def, ctx) => {
    const expected = { easy: "6-8", medium: "9-10", advanced: "11-12" }[def.level];
    if (def.grades !== expected) {
      ctx.addIssue({ code: "custom", message: `level "${def.level}" goes with grades "${expected}"` });
    }
    if (def.stage === "circuit" && !def.board) {
      ctx.addIssue({ code: "custom", message: "circuit experiments need a board" });
    }
    if (def.board) {
      const ids = new Set(def.board.slots.map((s) => s.id));
      for (const w of def.board.wires) {
        for (const end of [w.from, w.to]) {
          if (!ids.has(end.split(".")[0])) {
            ctx.addIssue({ code: "custom", message: `wire end "${end}" names an unknown slot` });
          }
        }
      }
    }
    if (def.prediction.type === "choice") {
      const options = new Set(def.prediction.options);
      const answers: string[] = [];
      const rule = def.answer;
      if (rule.kind === "cases") answers.push(...rule.cases.map((c) => c.answer), rule.otherwise);
      if (rule.kind === "compare") answers.push(rule.aBigger, rule.bBigger, rule.same);
      if (rule.kind === "change") answers.push(rule.up, rule.down, rule.same, ...(rule.zero ? [rule.zero] : []));
      for (const a of answers) {
        if (!options.has(a)) ctx.addIssue({ code: "custom", message: `answer "${a}" is not one of the options` });
      }
    }
  });

export const misconceptionSchema: z.ZodType<MisconceptionDef> = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  lab: labId,
  title: z.string().min(1),
  belief: z.string().min(1),
  conceptIds: z.array(z.string()),
  sources: z.array(z.string().min(1)).optional(),
  citationIds: z.array(z.string().regex(/^[a-z0-9-]+$/)).optional(),
});

export const hintSchema: z.ZodType<HintDef> = z.object({
  misconceptionId: z.string(),
  hints: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
  ask: z.string().min(1).optional(),
});

export const theorySchema: z.ZodType<TheoryDef> = z.object({
  id: z.string(),
  title: z.string().min(1),
  body: z.array(z.string().min(1)).min(1),
  equation: z.string().optional(),
  realWorld: z.string().min(1),
  sources: z.array(z.string().min(1)).optional(),
  citationIds: z.array(z.string().regex(/^[a-z0-9-]+$/)).optional(),
  model: z.string().min(1).optional(),
});
