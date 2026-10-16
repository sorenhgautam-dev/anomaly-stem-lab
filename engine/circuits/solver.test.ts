import { describe, expect, it } from "vitest";
import { ledLoop, makeBuild, parallelBulbs, resistorLoop, seriesBulbs, singleBulb, switchLoop } from "./fixtures";
import { solveCircuit } from "./solver";

/*
 * Expected values are worked out by hand from the part models:
 * battery 0.2 Ω internal, every wire 0.01 Ω, bulb 12 Ω (3 W at 6 V),
 * LED 2.0 V + 5 Ω once on, rated 20 mA, burns out above 40 mA, fuse 3 A.
 */

const r = (sim: { readings: Record<string, number> }, key: string) => sim.readings[key];

describe("circuit solver: bulbs", () => {
  it("drives one 12 Ω bulb on 6 V at about 0.491 A, nearly full brightness", () => {
    // I = 6 / (0.2 + 12 + 2 × 0.01) = 0.4910 A; V = 5.892 V; brightness = (V / 6)² = 0.964
    const sim = solveCircuit(singleBulb());
    expect(r(sim, "bulb.current")).toBeCloseTo(0.491, 3);
    expect(r(sim, "bulb.voltage")).toBeCloseTo(5.892, 2);
    expect(r(sim, "bulb.power")).toBeCloseTo(2.893, 2);
    expect(r(sim, "bulb.brightness")).toBeCloseTo(0.964, 2);
    expect(r(sim, "bulb.lit")).toBe(1);
    expect(r(sim, "bulb.burnt")).toBe(0);
    expect(r(sim, "batt.current")).toBeCloseTo(0.491, 3);
    expect(sim.faults).toEqual([]);
  });

  it("shares about 0.248 A through two bulbs in series, and they glow equally", () => {
    // I = 6 / (0.2 + 24 + 3 × 0.01) = 0.24763 A; V = 2.9715 V; brightness = 0.2453
    const sim = solveCircuit(seriesBulbs());
    expect(r(sim, "bulb-a.current")).toBeCloseTo(0.2476, 3);
    expect(r(sim, "bulb-b.current")).toBeCloseTo(0.2476, 3);
    expect(r(sim, "bulb-a.voltage")).toBeCloseTo(2.97, 2);
    expect(r(sim, "bulb-a.brightness")).toBeCloseTo(0.245, 2);
    // Equal up to gmin leakage (1e-9 S per node leaks a few nA between the bulbs).
    expect(Math.abs(r(sim, "bulb-a.brightness") - r(sim, "bulb-b.brightness"))).toBeLessThan(1e-6);
    expect(r(sim, "bulb-a.lit")).toBe(1);
    expect(r(sim, "bulb-b.lit")).toBe(1);
    // Terminal voltage sags by I × r: 6 − 0.2 × 0.2476 = 5.950 V
    expect(r(sim, "batt.voltage")).toBeCloseTo(5.95, 2);
    expect(sim.faults).toEqual([]);
  });

  it("gives each of two parallel bulbs nearly the full battery voltage", () => {
    // Ladder wiring: A sees 0.22 Ω of source + wires, B another 0.02 Ω.
    // R = 12 ‖ 12.02 = 6.005 Ω, I = 6 / 6.225 = 0.9639 A, I_A = 0.4823 A, I_B = 0.4815 A
    const sim = solveCircuit(parallelBulbs());
    expect(r(sim, "bulb-a.current")).toBeCloseTo(0.482, 2);
    expect(r(sim, "bulb-b.current")).toBeCloseTo(0.482, 2);
    expect(r(sim, "batt.current")).toBeCloseTo(0.964, 2);
    expect(r(sim, "bulb-a.brightness")).toBeCloseTo(0.93, 2);
    const series = solveCircuit(seriesBulbs());
    expect(r(sim, "bulb-a.brightness")).toBeGreaterThan(3 * r(series, "bulb-a.brightness"));
  });

  it("clamps brightness at 1 when a bulb is over-driven", () => {
    const sim = solveCircuit(singleBulb(9));
    expect(r(sim, "bulb.brightness")).toBe(1);
    expect(r(sim, "bulb.lit")).toBe(1);
  });
});

describe("circuit solver: current direction", () => {
  it("reports signed wire flows from → to, keyed exactly as the connection is stored", () => {
    const build = seriesBulbs();
    const reversed = { ...build, connections: [{ from: "bulb-a.a", to: "batt.a" }, ...build.connections.slice(1)] };
    const sim = solveCircuit(reversed);
    expect(sim.flows?.["bulb-a.a|batt.a"]).toBeCloseTo(-0.2476, 3);
    expect(sim.flows?.["bulb-a.b|bulb-b.a"]).toBeCloseTo(0.2476, 3);
    expect(sim.flows?.["bulb-b.b|batt.b"]).toBeCloseTo(0.2476, 3);
    expect(Object.keys(sim.flows ?? {}).sort()).toEqual(["bulb-a.a|batt.a", "bulb-a.b|bulb-b.a", "bulb-b.b|batt.b"]);
  });

  it("signs part flows a → b, so the battery runs negative inside", () => {
    const sim = solveCircuit(seriesBulbs());
    expect(r(sim, "bulb-a.flow")).toBeCloseTo(0.2476, 3);
    expect(r(sim, "batt.flow")).toBeCloseTo(-0.2476, 3);
  });

  it("reverses every flow when the battery is flipped, without changing brightness", () => {
    const sim = solveCircuit(seriesBulbs({ volts: 6, flipped: true }));
    expect(r(sim, "bulb-a.flow")).toBeCloseTo(-0.2476, 3);
    expect(sim.flows?.["batt.a|bulb-a.a"]).toBeCloseTo(-0.2476, 3);
    expect(r(sim, "bulb-a.brightness")).toBeCloseTo(0.245, 2);
    expect(sim.faults).toEqual([]);
  });
});

describe("circuit solver: LEDs", () => {
  it("lights a forward LED with a 100 Ω resistor on 3 V at about 9.5 mA", () => {
    // I = (3 − 2) / (0.2 + 100 + 5 + 3 × 0.01) = 9.503 mA; V_LED = 2 + 5 I = 2.048 V
    const sim = solveCircuit(ledLoop({ volts: 3, r: "resistor", ohms: 100 }));
    expect(r(sim, "led.current")).toBeCloseTo(0.0095, 4);
    expect(r(sim, "led.voltage")).toBeCloseTo(2.05, 2);
    expect(r(sim, "led.brightness")).toBeCloseTo(0.475, 2);
    expect(r(sim, "led.lit")).toBe(1);
    expect(r(sim, "led.burnt")).toBe(0);
    expect(r(sim, "r.current")).toBeCloseTo(0.0095, 4);
    expect(sim.faults).toEqual([]);
  });

  it("blocks current through a backwards LED (open circuit, no throw)", () => {
    const sim = solveCircuit(ledLoop({ volts: 3, flipped: true, r: "resistor" }));
    expect(r(sim, "led.current")).toBe(0);
    expect(r(sim, "led.lit")).toBe(0);
    expect(r(sim, "led.brightness")).toBe(0);
    // The whole battery voltage sits across the blocking LED.
    expect(r(sim, "led.voltage")).toBeCloseTo(3, 3);
    expect(sim.faults).toEqual(["open-circuit"]);
  });

  it("stays dark below the 2 V forward voltage", () => {
    const sim = solveCircuit(ledLoop({ volts: 1.5, r: "resistor" }));
    expect(r(sim, "led.current")).toBe(0);
    expect(r(sim, "led.lit")).toBe(0);
    expect(r(sim, "led.voltage")).toBeCloseTo(1.5, 3);
  });

  it("burns out an LED wired with no resistor, then shows the dark aftermath", () => {
    // I = (3 − 2) / (0.2 + 5 + 4 × 0.01) = 0.1908 A, far past the 40 mA limit
    const sim = solveCircuit(ledLoop({ volts: 3, r: "wire" }));
    expect(sim.faults).toEqual(["burnout:led"]);
    expect(r(sim, "led.burnt")).toBe(1);
    expect(r(sim, "led.lit")).toBe(0);
    expect(r(sim, "led.brightness")).toBe(0);
    expect(r(sim, "led.current")).toBe(0);
    expect(r(sim, "r.current")).toBe(0);
    expect(r(sim, "led.peak")).toBeCloseTo(0.191, 2);
  });

  it("lights only the forward one of two LEDs wired in opposite directions", () => {
    // I = (6 − 2) / (0.2 + 220 + 5 + 3 × 0.01) = 17.76 mA through led-1; led-2 is reversed
    const sim = solveCircuit(
      makeBuild(
        [
          ["batt", "battery", { volts: 6 }],
          ["r", "resistor"],
          ["led-1", "led"],
          ["led-2", "led", { flipped: true }],
        ],
        [
          ["batt.a", "r.a"],
          ["r.b", "led-1.a"],
          ["r.b", "led-2.a"],
          ["led-1.b", "batt.b"],
          ["led-2.b", "batt.b"],
        ],
      ),
    );
    expect(r(sim, "led-1.lit")).toBe(1);
    expect(r(sim, "led-1.current")).toBeCloseTo(0.01776, 4);
    expect(r(sim, "led-2.lit")).toBe(0);
    expect(r(sim, "led-2.current")).toBe(0);
    expect(sim.faults).toEqual([]);
  });
});

describe("circuit solver: shorts and gaps", () => {
  it("blows the fuse on a wire straight across the battery, without throwing", () => {
    // I = 6 / (0.2 + 0.01) = 28.57 A
    const sim = solveCircuit(makeBuild([["batt", "battery", { volts: 6 }]], [["batt.a", "batt.b"]]));
    expect(sim.faults).toEqual(["short-circuit"]);
    expect(r(sim, "fuse.peak")).toBeCloseTo(28.57, 1);
    expect(r(sim, "batt.current")).toBe(0);
    expect(sim.flows?.["batt.a|batt.b"]).toBe(0);
  });

  it("reports the fuse-blown state when a wire part shorts a lit bulb", () => {
    const sim = solveCircuit(
      makeBuild(
        [
          ["batt", "battery", { volts: 6 }],
          ["bulb", "bulb"],
          ["short", "wire"],
        ],
        [
          ["batt.a", "bulb.a"],
          ["bulb.b", "batt.b"],
          ["batt.a", "short.a"],
          ["short.b", "batt.b"],
        ],
      ),
    );
    expect(sim.faults).toEqual(["short-circuit"]);
    expect(r(sim, "fuse.peak")).toBeGreaterThan(3);
    expect(r(sim, "bulb.current")).toBe(0);
    expect(r(sim, "bulb.lit")).toBe(0);
    expect(r(sim, "short.current")).toBe(0);
    expect(Object.values(sim.flows ?? {}).every((f) => f === 0)).toBe(true);
  });

  it("carries no current through an open switch, with the full voltage across it", () => {
    const sim = solveCircuit(switchLoop("minus", false));
    expect(r(sim, "bulb.current")).toBe(0);
    expect(r(sim, "bulb.lit")).toBe(0);
    expect(r(sim, "switch.closed")).toBe(0);
    expect(r(sim, "switch.current")).toBe(0);
    expect(r(sim, "switch.voltage")).toBeCloseTo(6, 3);
    expect(sim.faults).toEqual(["open-circuit"]);
  });

  it("lights the bulb once the switch is closed", () => {
    const sim = solveCircuit(switchLoop("minus", true));
    expect(r(sim, "switch.closed")).toBe(1);
    expect(r(sim, "bulb.lit")).toBe(1);
    // I = 6 / (0.2 + 12 + 0.01 switch + 3 × 0.01 wires) = 0.4902 A
    expect(r(sim, "bulb.current")).toBeCloseTo(0.4902, 3);
    expect(sim.faults).toEqual([]);
  });

  it("treats an empty slot as a gap", () => {
    const sim = solveCircuit(ledLoop({ volts: 3, r: "empty" }));
    expect(r(sim, "led.current")).toBe(0);
    expect(sim.readings["r.current"]).toBeUndefined();
    expect(sim.faults).toEqual(["open-circuit"]);
  });

  it("never throws, and keeps every reading finite, on odd builds", () => {
    const odd = [
      makeBuild([], []),
      makeBuild([["bulb", "bulb"]], []),
      makeBuild([["batt", "battery"]], []),
      makeBuild([["batt", "battery", { volts: Number.NaN }], ["bulb", "bulb", { ohms: -5 }]], [["batt.a", "bulb.a"], ["bulb.b", "batt.b"]]),
      makeBuild([["batt", "battery"], ["bulb", "bulb", { ohms: "big" }]], [["batt.a", "bulb.a"], ["bulb.b", "nowhere.b"], ["bulb.a", "bulb.a"]]),
      makeBuild(
        [["b1", "battery"], ["b2", "battery", { volts: 9 }], ["bulb", "bulb"]],
        [["b1.a", "b2.a"], ["b1.b", "bulb.a"], ["bulb.b", "b2.b"]],
      ),
    ];
    for (const build of odd) {
      const sim = solveCircuit(build);
      expect(Object.values(sim.readings).every(Number.isFinite)).toBe(true);
      expect(Object.values(sim.flows ?? {}).every(Number.isFinite)).toBe(true);
    }
  });

  it("raises no open-circuit fault when there is no battery at all", () => {
    expect(solveCircuit(makeBuild([["bulb", "bulb"]], [["bulb.a", "bulb.b"]])).faults).toEqual([]);
  });
});

describe("circuit solver: resistor heating (rated 0.25 W)", () => {
  it("overheats a 10 Ω resistor on 9 V but keeps it conducting", () => {
    // I = 9 / (10 + 0.2 + 2 × 0.01) = 0.8806 A; P = I² × 10 = 7.75 W, 31× the rating
    const sim = solveCircuit(resistorLoop(9, 10));
    expect(r(sim, "r.current")).toBeCloseTo(0.8806, 3);
    expect(r(sim, "r.power")).toBeCloseTo(7.75, 1);
    expect(r(sim, "r.overheat")).toBe(1);
    expect(r(sim, "r.temperature")).toBe(350);
    expect(sim.faults).toEqual(["overheat:r"]);
  });

  it("keeps a 1 kΩ resistor on 9 V cool", () => {
    // I = 9 / 1000.22 = 8.998 mA; P = 0.0810 W; T = 25 + 125 × P = 35.1 °C
    const sim = solveCircuit(resistorLoop(9, 1000));
    expect(r(sim, "r.power")).toBeCloseTo(0.081, 3);
    expect(r(sim, "r.temperature")).toBeCloseTo(35.1, 1);
    expect(r(sim, "r.overheat")).toBe(0);
    expect(sim.faults).toEqual([]);
  });

  it("warms a 470 Ω resistor on 9 V without overheating it", () => {
    // I = 9 / 470.22 = 19.14 mA; P = 0.1722 W; T = 25 + 125 × P = 46.5 °C
    const sim = solveCircuit(resistorLoop(9, 470));
    expect(r(sim, "r.power")).toBeCloseTo(0.172, 3);
    expect(r(sim, "r.temperature")).toBeCloseTo(46.5, 1);
    expect(r(sim, "r.overheat")).toBe(0);
  });
});

describe("circuit solver: motors and buzzers", () => {
  it("spins a motor and sounds a buzzer when current flows, and not when it doesn't", () => {
    const on = solveCircuit(
      makeBuild(
        [
          ["batt", "battery", { volts: 6 }],
          ["motor", "motor"],
          ["buzzer", "buzzer"],
        ],
        [
          ["batt.a", "motor.a"],
          ["motor.a", "buzzer.a"],
          ["batt.b", "motor.b"],
          ["motor.b", "buzzer.b"],
        ],
      ),
    );
    expect(r(on, "motor.speed")).toBeGreaterThan(0.9);
    expect(r(on, "buzzer.sound")).toBeGreaterThan(0.9);
    const off = solveCircuit(makeBuild([["batt", "battery"], ["motor", "motor"]], [["batt.a", "motor.a"]]));
    expect(r(off, "motor.speed")).toBe(0);
  });
});
