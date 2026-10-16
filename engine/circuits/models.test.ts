import { describe, expect, it } from "vitest";
import type { Build, Simulate, Simulation } from "../types";
import {
  bulbWithWires,
  fixtureDef,
  ledLoop,
  makeBuild,
  parallelBulbs,
  resistorLoop,
  seriesBulbs,
  shortcutAcrossB,
  singleBulb,
  switchLoop,
} from "./fixtures";
import { circuitModels } from "./index";
import { solveCircuit } from "./solver";

/*
 * Each wrong model must disagree with reality in the situation its
 * misconception is about, and agree where the belief has nothing to say.
 */

const real = (build: Build) => {
  const model = circuitModels.stages.circuit;
  if (!model) throw new Error("no circuit stage");
  return model(fixtureDef, build);
};
const belief = (id: string, build: Build): Simulation => {
  const model: Simulate | undefined = circuitModels.wrongModels[id];
  if (!model) throw new Error(`no wrong model ${id}`);
  return model(fixtureDef, build);
};
const r = (sim: Simulation, key: string) => sim.readings[key] ?? 0;

describe("real circuit model", () => {
  it("is registered for the circuit stage and is the solver", () => {
    expect(real(seriesBulbs())).toEqual(solveCircuit(seriesBulbs()));
  });
});

describe("led-any-direction: LEDs work either way round", () => {
  it("lights a backwards LED that really stays dark", () => {
    const build = ledLoop({ volts: 3, flipped: true, r: "resistor", ohms: 100 });
    expect(r(real(build), "led.lit")).toBe(0);
    const sim = belief("led-any-direction", build);
    expect(r(sim, "led.lit")).toBe(1);
    expect(r(sim, "led.current")).toBeCloseTo(0.0095, 4);
    expect(sim.faults).toEqual([]);
  });

  it("still needs the 2 V push", () => {
    expect(r(belief("led-any-direction", ledLoop({ volts: 1.5, flipped: true })), "led.lit")).toBe(0);
  });
});

describe("no-resistor-needed: more current only makes an LED brighter", () => {
  it("keeps an LED with no resistor glowing at full brightness instead of burning out", () => {
    const build = ledLoop({ volts: 3, r: "wire" });
    expect(real(build).faults).toEqual(["burnout:led"]);
    const sim = belief("no-resistor-needed", build);
    expect(sim.faults).toEqual([]);
    expect(r(sim, "led.lit")).toBe(1);
    expect(r(sim, "led.brightness")).toBe(1);
    expect(r(sim, "led.current")).toBeCloseTo(0.191, 2);
  });
});

describe("current-used-up: the first bulb uses up some current", () => {
  it("dims the second of two series bulbs to half the first", () => {
    // Real: both 0.2453. Belief: bulb A as solved, bulb B half of it.
    const sim = belief("current-used-up", seriesBulbs());
    expect(r(sim, "bulb-a.brightness")).toBeCloseTo(0.245, 2);
    expect(r(sim, "bulb-b.brightness")).toBeCloseTo(0.123, 2);
    expect(r(sim, "bulb-b.current")).toBeLessThan(r(sim, "bulb-a.current"));
  });

  it("follows the current from the + terminal, so flipping the battery dims bulb A instead", () => {
    const sim = belief("current-used-up", seriesBulbs({ volts: 6, flipped: true }));
    expect(r(sim, "bulb-b.brightness")).toBeCloseTo(0.245, 2);
    expect(r(sim, "bulb-a.brightness")).toBeCloseTo(0.123, 2);
  });

  it("leaves bulbs on separate parallel branches alone", () => {
    const sim = belief("current-used-up", parallelBulbs());
    const truth = real(parallelBulbs());
    expect(r(sim, "bulb-a.brightness")).toBeCloseTo(r(truth, "bulb-a.brightness"), 6);
    expect(r(sim, "bulb-b.brightness")).toBeCloseTo(r(truth, "bulb-b.brightness"), 6);
  });
});

describe("battery-constant-current: a battery always pushes the same current", () => {
  it("splits one bulb's current between two parallel bulbs", () => {
    // I0 = 6 / (12 + 0.2) = 0.4918 A; each bulb gets about I0 / 2 = 0.246 A (really 0.482 A).
    const truth = real(parallelBulbs());
    expect(r(truth, "bulb-a.current")).toBeCloseTo(0.482, 2);
    const sim = belief("battery-constant-current", parallelBulbs());
    expect(r(sim, "batt.current")).toBeCloseTo(0.492, 3);
    expect(r(sim, "bulb-a.current")).toBeCloseTo(0.246, 3);
    expect(r(sim, "bulb-b.current")).toBeCloseTo(0.246, 3);
    expect(r(sim, "bulb-a.brightness")).toBeCloseTo(0.242, 2);
  });

  it("agrees with reality for a single bulb", () => {
    const sim = belief("battery-constant-current", singleBulb());
    expect(Math.abs(r(sim, "bulb.brightness") - r(real(singleBulb()), "bulb.brightness"))).toBeLessThan(0.01);
  });
});

describe("switch-only-positive: a switch only works on the + side", () => {
  it("lights the bulb through an open switch on the − side", () => {
    const build = switchLoop("minus", false);
    expect(r(real(build), "bulb.lit")).toBe(0);
    const sim = belief("switch-only-positive", build);
    expect(r(sim, "bulb.lit")).toBe(1);
    expect(r(sim, "switch.closed")).toBe(0);
  });

  it("still lets an open switch on the + side break the circuit", () => {
    expect(r(belief("switch-only-positive", switchLoop("plus", false)), "bulb.lit")).toBe(0);
  });
});

describe("short-harmless: a wire across a part changes nothing", () => {
  it("ignores a shortcut wire across bulb B", () => {
    const build = shortcutAcrossB(true);
    const truth = real(build);
    expect(r(truth, "bulb-b.lit")).toBe(0);
    expect(r(truth, "bulb-a.brightness")).toBeCloseTo(0.958, 2);
    const sim = belief("short-harmless", build);
    expect(r(sim, "bulb-a.brightness")).toBeCloseTo(0.245, 2);
    expect(r(sim, "bulb-b.lit")).toBe(1);
    expect(r(sim, "shortcut.current")).toBe(0);
  });

  it("ignores a wire straight across the battery, so nothing blows", () => {
    const build = makeBuild(
      [
        ["batt", "battery", { volts: 6 }],
        ["bulb", "bulb"],
      ],
      [
        ["batt.a", "bulb.a"],
        ["bulb.b", "batt.b"],
        ["batt.a", "batt.b"],
      ],
    );
    expect(real(build).faults).toEqual(["short-circuit"]);
    const sim = belief("short-harmless", build);
    expect(sim.faults).toEqual([]);
    expect(r(sim, "bulb.lit")).toBe(1);
  });
});

describe("one-wire-enough: one wire from + lights a bulb", () => {
  it("lights a bulb that has a wire from + but no way back", () => {
    const build = bulbWithWires(true, false);
    const truth = real(build);
    expect(r(truth, "bulb.lit")).toBe(0);
    expect(truth.faults).toEqual(["open-circuit"]);
    const sim = belief("one-wire-enough", build);
    expect(r(sim, "bulb.lit")).toBe(1);
    expect(r(sim, "bulb.brightness")).toBeGreaterThan(0.9);
    expect(sim.faults).toEqual([]);
    expect(Object.keys(sim.flows ?? {}).sort()).toEqual(Object.keys(truth.flows ?? {}).sort());
  });

  it("needs the wire to come from +, not −", () => {
    expect(r(belief("one-wire-enough", bulbWithWires(false, true)), "bulb.lit")).toBe(0);
  });

  it("agrees with reality once the circuit is complete", () => {
    const build = bulbWithWires(true, true);
    expect(belief("one-wire-enough", build)).toEqual(real(build));
  });
});

describe("more-resistance-more-heat: a bigger resistor gets hotter", () => {
  it("keeps a 10 Ω resistor cool on 9 V, though it really overheats", () => {
    // Belief: the current is always the 100 Ω current, 9 / 100.22 = 0.0898 A, so P = I² × 10 = 0.081 W.
    expect(real(resistorLoop(9, 10)).faults).toEqual(["overheat:r"]);
    const sim = belief("more-resistance-more-heat", resistorLoop(9, 10));
    expect(r(sim, "r.current")).toBeCloseTo(0.0898, 4);
    expect(r(sim, "r.power")).toBeCloseTo(0.0806, 3);
    expect(sim.faults).toEqual([]);
  });

  it("overheats a 1 kΩ resistor on 9 V, though it really stays cool", () => {
    // Belief: P = 0.0898² × 1000 = 8.06 W. Real: P = 0.081 W.
    expect(real(resistorLoop(9, 1000)).faults).toEqual([]);
    const sim = belief("more-resistance-more-heat", resistorLoop(9, 1000));
    expect(r(sim, "r.power")).toBeCloseTo(8.06, 1);
    expect(r(sim, "r.overheat")).toBe(1);
    expect(sim.faults).toEqual(["overheat:r"]);
  });
});

describe("all circuit wrong models", () => {
  const odd: Build[] = [
    makeBuild([], []),
    makeBuild([["bulb", "bulb"]], [["bulb.a", "bulb.b"]]),
    makeBuild([["batt", "battery"]], [["batt.a", "batt.b"]]),
    makeBuild([["batt", "battery"], ["r", "resistor"], ["sw", "switch", { closed: false }]], [["batt.a", "nowhere.a"]]),
  ];

  it("never throw on odd builds and never change the build they're given", () => {
    for (const [id, model] of Object.entries(circuitModels.wrongModels)) {
      for (const build of [...odd, seriesBulbs(), ledLoop({ r: "wire" }), shortcutAcrossB(true)]) {
        const before = JSON.stringify(build);
        const sim = model(fixtureDef, build);
        expect(Object.values(sim.readings).every(Number.isFinite), id).toBe(true);
        expect(JSON.stringify(build), id).toBe(before);
      }
    }
  });
});
