import type { Build, CircuitPartKind, ExperimentDef, PropValue } from "../types";

/*
 * Test fixtures: small hand-wired circuits used by the circuit tests.
 * Every slot has terminals "<slot>.a" and "<slot>.b"; wires join terminals.
 * Battery a = +, b = −. LED a = anode, b = cathode (unless flipped).
 */

export type PartSpec = [slot: string, kind: CircuitPartKind, props?: Record<string, PropValue>];
export type WireSpec = [from: string, to: string];

/** A minimal circuit experiment, for calling Simulate(def, build). The circuit models only read the build. */
export const fixtureDef: ExperimentDef = {
  id: "robotics-fixture",
  lab: "robotics",
  level: "easy",
  grades: "6-8",
  order: 1,
  title: "Fixture",
  goal: "Test a circuit.",
  intro: "Test a circuit.",
  minutes: 2,
  stage: "circuit",
  parts: [],
  outlines: false,
  board: { slots: [{ id: "batt", label: "Battery", x: 170, y: 300, orientation: "v", accepts: [] }], wires: [] },
  prediction: { type: "choice", question: "?", options: ["Yes", "No"] },
  answer: { kind: "cases", cases: [{ when: { fault: "short-circuit" }, answer: "Yes" }], otherwise: "No" },
  misconceptions: [],
  allowedEdits: [],
  theoryId: "fixture",
};

/** Battery + → top wire slot → bulb → bottom wire slot → battery −. Either wire slot may be empty. */
export function bulbWithWires(top: boolean, bottom: boolean): Build {
  const parts: PartSpec[] = [
    ["batt", "battery", { volts: 6 }],
    ["bulb", "bulb"],
  ];
  if (top) parts.push(["wire-top", "wire"]);
  if (bottom) parts.push(["wire-bottom", "wire"]);
  return makeBuild(parts, [
    ["batt.a", "wire-top.a"],
    ["wire-top.b", "bulb.a"],
    ["bulb.b", "wire-bottom.b"],
    ["wire-bottom.a", "batt.b"],
  ]);
}

export function makeBuild(parts: PartSpec[], wires: WireSpec[]): Build {
  return {
    experimentId: "robotics-fixture",
    parts: parts.map(([slot, kind, props]) => ({ id: `${kind}-${slot}`, kind, slot, props: { ...props } })),
    connections: wires.map(([from, to]) => ({ from, to })),
    settings: {},
  };
}

/** One bulb straight across a battery (2 wires). */
export function singleBulb(volts = 6, bulb: Record<string, PropValue> = {}): Build {
  return makeBuild(
    [
      ["batt", "battery", { volts }],
      ["bulb", "bulb", bulb],
    ],
    [
      ["batt.a", "bulb.a"],
      ["bulb.b", "batt.b"],
    ],
  );
}

/** Battery + → bulb A → bulb B → battery − (3 wires). */
export function seriesBulbs(battery: Record<string, PropValue> = { volts: 6 }): Build {
  return makeBuild(
    [
      ["batt", "battery", battery],
      ["bulb-a", "bulb"],
      ["bulb-b", "bulb"],
    ],
    [
      ["batt.a", "bulb-a.a"],
      ["bulb-a.b", "bulb-b.a"],
      ["bulb-b.b", "batt.b"],
    ],
  );
}

/** Bulbs A and B side by side, as rungs of a ladder between a top and a bottom rail. */
export function parallelBulbs(): Build {
  return makeBuild(
    [
      ["batt", "battery", { volts: 6 }],
      ["bulb-a", "bulb"],
      ["bulb-b", "bulb"],
    ],
    [
      ["batt.a", "bulb-a.a"],
      ["bulb-a.a", "bulb-b.a"],
      ["batt.b", "bulb-a.b"],
      ["bulb-a.b", "bulb-b.b"],
    ],
  );
}

/** Battery + → slot r (a resistor, a plain wire, or nothing) → LED → battery −. */
export function ledLoop(opts: {
  volts?: number;
  flipped?: boolean;
  r?: "resistor" | "wire" | "empty";
  ohms?: number;
}): Build {
  const { volts = 3, flipped = false, r = "resistor", ohms = 100 } = opts;
  const parts: PartSpec[] = [
    ["batt", "battery", { volts }],
    ["led", "led", { flipped }],
  ];
  if (r === "resistor") parts.push(["r", "resistor", { ohms }]);
  if (r === "wire") parts.push(["r", "wire"]);
  return makeBuild(parts, [
    ["batt.a", "r.a"],
    ["r.b", "led.a"],
    ["led.b", "batt.b"],
  ]);
}

/** One resistor straight across a battery (2 wires). */
export function resistorLoop(volts: number, ohms: number): Build {
  return makeBuild(
    [
      ["batt", "battery", { volts }],
      ["r", "resistor", { ohms }],
    ],
    [
      ["batt.a", "r.a"],
      ["r.b", "batt.b"],
    ],
  );
}

/** Battery, one bulb, and a switch on the plus side (before the bulb) or the minus side (after it). */
export function switchLoop(side: "plus" | "minus", closed: boolean): Build {
  const parts: PartSpec[] = [
    ["batt", "battery", { volts: 6 }],
    ["bulb", "bulb"],
    ["switch", "switch", { closed }],
  ];
  const wires: WireSpec[] =
    side === "plus"
      ? [
          ["batt.a", "switch.a"],
          ["switch.b", "bulb.a"],
          ["bulb.b", "batt.b"],
        ]
      : [
          ["batt.a", "bulb.a"],
          ["bulb.b", "switch.b"],
          ["switch.a", "batt.b"],
        ];
  return makeBuild(parts, wires);
}

/** Series bulbs A and B, with a shortcut slot wired across bulb B's two terminals. */
export function shortcutAcrossB(withWire: boolean): Build {
  const parts: PartSpec[] = [
    ["batt", "battery", { volts: 6 }],
    ["bulb-a", "bulb"],
    ["bulb-b", "bulb"],
  ];
  if (withWire) parts.push(["shortcut", "wire"]);
  return makeBuild(parts, [
    ["batt.a", "bulb-a.a"],
    ["bulb-a.b", "bulb-b.a"],
    ["bulb-b.b", "batt.b"],
    ["shortcut.a", "bulb-b.a"],
    ["shortcut.b", "bulb-b.b"],
  ]);
}
