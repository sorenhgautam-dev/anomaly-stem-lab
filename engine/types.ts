/*
 * Shared engine types. engine/ is pure TypeScript: no React imports, no `any`.
 *
 * How a run works:
 *   1. The experiment's stage model (real physics) turns the student's Build
 *      into a Simulation: named readings, faults, optional path and timeline.
 *   2. The experiment's AnswerRule (JSON) maps that Simulation to an answer in
 *      the same shape as the student's Prediction. Match → correct.
 *   3. On a wrong prediction, each listed misconception's wrong model runs on
 *      the same Build. A wrong model whose answer matches the prediction is a
 *      candidate (diagnosis). Its Simulation is the "ghost" shown beside
 *      reality.
 *
 * Content (experiments, misconception text, hints, theory) lives in JSON under
 * content/ and is validated with engine/schema.ts. Physics lives in code under
 * engine/<lab>/ and is wired up in engine/registry.ts.
 */

export type LabId = "chemistry" | "robotics";

/** Difficulty levels (CLAUDE.md §1.1), each tied to a school grade band. */
export type LevelId = "easy" | "medium" | "advanced";
export type Grades = "6-8" | "9-10" | "11-12";
export const LEVEL_GRADES: Record<LevelId, Grades> = { easy: "6-8", medium: "9-10", advanced: "11-12" };
export const LEVELS: LevelId[] = ["easy", "medium", "advanced"];

/** Which simulator and renderer an experiment uses. */
export type StageId =
  // robotics lab
  | "circuit"
  | "robot"
  | "gears"
  | "pwm"
  // chemistry lab
  | "fizz"
  | "dissolve"
  | "heat"
  | "rate"
  | "melt"
  | "indicator"
  | "neutralise"
  | "burn"
  | "gaslaw"
  | "catalyst"
  | "equilibrium";

/** A tunable value on a part or a control (ohms, volts, flipped, °C). */
export type PropValue = number | boolean | string;

// ---------------------------------------------------------------------------
// Circuit boards (robotics lab)
// ---------------------------------------------------------------------------

export type CircuitPartKind =
  | "battery"
  | "wire"
  | "switch"
  | "resistor"
  | "bulb"
  | "led"
  | "motor"
  | "buzzer";

/**
 * A place on the board where a part snaps in. Every slot has two terminals,
 * "a" and "b". Horizontal slots: a is the left end, b the right. Vertical: a
 * is the top end, b the bottom. Polarity: battery a = +, b = −. LED a =
 * anode, b = cathode, unless the LED's `flipped` prop is true.
 */
export interface BoardSlot {
  id: string;
  /** Shown on the faint outline, e.g. "LED". */
  label: string;
  /** Centre of the slot in board units (the board is 1000 × 600). */
  x: number;
  y: number;
  orientation: "h" | "v";
  /** Part kinds the student may drop here. */
  accepts: CircuitPartKind[];
  /** Part that is always here and can't be removed (e.g. the battery). */
  fixed?: { kind: CircuitPartKind; props?: Record<string, PropValue> };
  /** Part placed at the start, which the student may change or remove. */
  initial?: { kind: CircuitPartKind; props?: Record<string, PropValue> };
}

/** A pre-drawn wire between two slot terminals, e.g. "batt.a" → "led.a". */
export interface BoardWire {
  from: string;
  to: string;
  /** Corner points for drawing, in board units. Purely visual. */
  via?: [number, number][];
}

export interface BoardDef {
  slots: BoardSlot[];
  wires: BoardWire[];
}

/** Slot length in board units: terminals sit at ±SLOT_LENGTH / 2 from the centre. */
export const SLOT_LENGTH = 120;

// ---------------------------------------------------------------------------
// Builds
// ---------------------------------------------------------------------------

export interface PlacedPart {
  /** Unique within the build, e.g. "led-1". */
  id: string;
  kind: CircuitPartKind;
  /** The board slot it occupies. */
  slot: string;
  /**
   * Part settings. Known props:
   *   battery  { volts: number }                 default 6
   *   resistor { ohms: number }                  default 220
   *   bulb     { ohms: number }                  default 12
   *   led      { flipped: boolean }              default false
   *   switch   { closed: boolean }               default true
   */
  props: Record<string, PropValue>;
}

/** A wire between two slot terminals, written "slotId.a" / "slotId.b". */
export interface Connection {
  from: string;
  to: string;
}

/** What the student has built. Everything a simulator needs to run it. */
export interface Build {
  experimentId: string;
  /** Circuit parts in slots. Empty for chemistry and robot stages. */
  parts: PlacedPart[];
  /** Board wires plus any wires the student added (e.g. a shortcut wire). */
  connections: Connection[];
  /** Control values for chemistry and robot stages (see ControlDef ids). */
  settings: Record<string, PropValue>;
}

// ---------------------------------------------------------------------------
// Controls (chemistry and robot stages)
// ---------------------------------------------------------------------------

export type ControlDef =
  | {
      type: "toggle";
      id: string;
      label: string;
      /** Labels for the two states, e.g. "Sealed" / "Open". */
      onLabel: string;
      offLabel: string;
      initial: boolean;
    }
  | {
      type: "slider";
      id: string;
      label: string;
      min: number;
      max: number;
      step: number;
      unit: string;
      initial: number;
    }
  | {
      type: "choice";
      id: string;
      label: string;
      /** The setting gets the option's value (a string). */
      options: { value: string; label: string }[];
      initial: string;
    };

// ---------------------------------------------------------------------------
// Predictions and answers
// ---------------------------------------------------------------------------

export interface Point {
  x: number;
  y: number;
}

/** How an experiment asks for a prediction (lives in the experiment JSON). */
export type PredictionSpec =
  | { type: "choice"; question: string; options: string[] }
  | {
      type: "slider";
      question: string;
      min: number;
      max: number;
      step: number;
      unit?: string;
      /** Absolute tolerance for a match. */
      tolerance: number;
    };

/** The student's answer. Same shape as Outcome.result. */
export type Prediction = { type: "choice"; value: string } | { type: "slider"; value: number };

/** A test on a Simulation's readings or faults (JSON-friendly). */
export type Condition =
  | { reading: string; op: ">" | ">=" | "<" | "<=" | "==" | "!="; value: number }
  | { fault: string }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

/**
 * Maps a Simulation to the answer of the experiment's question.
 *
 *  - cases:   first case whose condition holds wins, else `otherwise`.
 *  - compare: compares two readings of the same run (a vs b).
 *  - change:  compares one reading between the experiment's starting build
 *             (the baseline) and the student's build. `zero` (optional) wins
 *             when the new value is ~0, e.g. "Goes out".
 *  - value:   the reading itself, for slider predictions.
 */
export type AnswerRule =
  | { kind: "cases"; cases: { when: Condition; answer: string }[]; otherwise: string }
  | {
      kind: "compare";
      a: string;
      b: string;
      /** Relative tolerance: |a − b| ≤ tolerance × max(|a|, |b|) counts as equal. */
      tolerance: number;
      aBigger: string;
      bBigger: string;
      same: string;
    }
  | {
      kind: "change";
      reading: string;
      tolerance: number;
      up: string;
      down: string;
      same: string;
      zero?: string;
    }
  | { kind: "value"; reading: string };

// ---------------------------------------------------------------------------
// Edits (for conflict(): "try this one small change")
// ---------------------------------------------------------------------------

export type EditDef =
  | { op: "toggle-prop"; slot: string; prop: string }
  | { op: "place"; slot: string; kind: CircuitPartKind; props?: Record<string, PropValue> }
  | { op: "remove"; slot: string }
  | { op: "connect"; from: string; to: string }
  | { op: "disconnect"; from: string; to: string }
  | { op: "set"; setting: string; value: PropValue };

export interface AllowedEdit {
  id: string;
  /** Imperative, shown to the student: "Flip the LED". */
  label: string;
  edit: EditDef;
}

// ---------------------------------------------------------------------------
// Simulation results
// ---------------------------------------------------------------------------

export interface TimelineFrame {
  /** Seconds since the run started. */
  t: number;
  values: Record<string, number>;
}

/** What a model (real or wrong) says happens. */
export interface Simulation {
  /**
   * Named values. Circuit stage, per slot id:
   *   `${slot}.current` (A, magnitude) `${slot}.voltage` (V across, magnitude)
   *   `${slot}.power` (W) `${slot}.brightness` (0..1, bulbs and LEDs)
   *   `${slot}.lit` (1 / 0) `${slot}.burnt` (1 / 0)
   * Other stages document their readings in their model files.
   */
  readings: Record<string, number>;
  /**
   * Fault codes, empty when healthy: "short-circuit", "open-circuit",
   * `burnout:${slot}`, …
   */
  faults: string[];
  /** Circuit stage: current through each board/student wire, keyed "from|to" (A, signed from→to). */
  flows?: Record<string, number>;
  /** Robot stage: the path driven, in arena units. */
  path?: Point[];
  /** How the run unfolds, for animation and the time scrubber. */
  timeline?: TimelineFrame[];
}

export interface Outcome extends Simulation {
  /** The answer this outcome gives to the experiment's question. */
  result: Prediction;
}

export type Simulate = (def: ExperimentDef, build: Build) => Simulation;

/** What each lab folder (engine/circuits, engine/chemistry, engine/robotics) exports. */
export interface LabModels {
  /** Real physics, per stage. */
  stages: Partial<Record<StageId, Simulate>>;
  /** Wrong-model physics, per misconception id. */
  wrongModels: Record<string, Simulate>;
}

export type Verdict = "correct" | "wrong";

/** Matching wrong-model runs per misconception id, carried across runs. */
export type Evidence = Record<string, number>;

export interface Diagnosis {
  /** Misconceptions whose wrong model predicted what the student predicted. */
  candidates: string[];
  /** Set only once a misconception has 2+ matching runs of evidence. */
  likely: string | null;
  evidence: Evidence;
  /** The best candidate's outcome: what the student's belief says happens. */
  ghost: Outcome | null;
  /** Misconception id the ghost and hints come from (best candidate). */
  focus: string | null;
}

export interface RunResult {
  verdict: Verdict;
  /** What really happened (the real model). */
  outcome: Outcome;
  /** Present only when the verdict is "wrong". */
  diagnosis: Diagnosis | null;
  /** The experiment's goal condition held (always true when it has none). */
  goalMet: boolean;
}

// ---------------------------------------------------------------------------
// Content (validated with zod at load time, see engine/schema.ts)
// ---------------------------------------------------------------------------

export interface ExperimentDef {
  id: string;
  lab: LabId;
  /** Experiments in a level unlock in order; finishing them all unlocks the next level. */
  level: LevelId;
  grades: Grades;
  /** Position within the lab and level (1, 2, 3, …). */
  order: number;
  title: string;
  /** One sentence: what the student is trying to do. */
  goal: string;
  /** Ano's opening line for this experiment. */
  intro: string;
  /** Rough length in minutes (2–5). */
  minutes: number;
  stage: StageId;
  /** Circuit parts offered in the tray. */
  parts: CircuitPartKind[];
  /** Show faint outlines where parts go. */
  outlines: boolean;
  board?: BoardDef;
  controls?: ControlDef[];
  prediction: PredictionSpec;
  answer: AnswerRule;
  /** Optional success condition beyond a correct prediction. */
  goalCondition?: Condition;
  /** Misconception ids this experiment can diagnose. */
  misconceptions: string[];
  /** Small edits conflict() may try. */
  allowedEdits: AllowedEdit[];
  theoryId: string;
  /** Short real-lab safety note (chemistry). */
  safety?: string;
}

/** Nudge, principle, fix. */
export type HintLadder = [string, string, string];

/** Misconception text (content/misconceptions/<id>.json). */
export interface MisconceptionDef {
  /** e.g. "current-used-up" */
  id: string;
  lab: LabId;
  /** e.g. "Current gets used up" */
  title: string;
  /** One or two sentences in the student's voice: what they believe. */
  belief: string;
  /** Links into the misconception map. */
  conceptIds: string[];
  /** Where this misconception is documented (research papers, OpenStax). RESOURCES.md §6. */
  sources?: string[];
}

/** Hint ladder (content/hints/<misconceptionId>.json). */
export interface HintDef {
  misconceptionId: string;
  hints: HintLadder;
}

/** "See the theory" (content/theory/<id>.json). */
export interface TheoryDef {
  id: string;
  title: string;
  /** Short paragraphs, plain text. */
  body: string[];
  /** Optional key relationship, e.g. "V = I × R". */
  equation?: string;
  /** Where this shows up in real life. */
  realWorld: string;
  /** Reliable sources the explanation was checked against (e.g. OpenStax sections). */
  sources?: string[];
}

/** A wrong-model simulator plus its text. */
export interface Misconception extends MisconceptionDef {
  simulate: Simulate;
  hints: HintLadder;
}
