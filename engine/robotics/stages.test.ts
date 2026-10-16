import { describe, expect, it } from "vitest";
import type { Build, ControlDef, ExperimentDef, PropValue, Simulation, StageId } from "../types";
import { robotModels } from "./index";

/*
 * Robot, gears and PWM stages. Expected numbers are worked out by hand.
 *
 * Robot: wheels at 20 cm/s for 100 %, wheelbase 12 cm, 4 s from (0, 0) facing +y.
 *   left 30 % / right 80 %: vL = 6, vR = 16 cm/s, v = 11 cm/s, ω = 10 / 12 rad/s.
 *   Turn = 4 × 10/12 rad = 3.3333 rad = 190.99° (left). Distance = 44 cm.
 *   Arc radius v/ω = 13.2 cm: end x = 13.2 (cos 3.3333 − 1) = −26.16, y = 13.2 sin 3.3333 = −2.52.
 */

function def(stage: StageId, controls: ControlDef[]): ExperimentDef {
  return {
    id: "robotics-fixture",
    lab: "robotics",
    level: "medium",
    grades: "9-10",
    order: 1,
    title: "Fixture",
    goal: "Test a stage.",
    intro: "Test a stage.",
    minutes: 2,
    stage,
    parts: [],
    outlines: false,
    controls,
    prediction: { type: "choice", question: "?", options: ["A", "B"] },
    answer: { kind: "cases", cases: [{ when: { fault: "x" }, answer: "A" }], otherwise: "B" },
    misconceptions: [],
    allowedEdits: [],
    theoryId: "fixture",
  };
}

const slider = (id: string, initial: number, min = 0, max = 100): ControlDef => ({
  type: "slider",
  id,
  label: id,
  min,
  max,
  step: 1,
  unit: "",
  initial,
});

const build = (settings: Record<string, PropValue>): Build => ({ experimentId: "robotics-fixture", parts: [], connections: [], settings });

const robotDef = def("robot", [slider("left", 30), slider("right", 80)]);
const gearsDef = def("gears", [slider("driver", 12, 8, 40), slider("driven", 36, 8, 40)]);
const pwmDef = def("pwm", [slider("duty", 50, 5, 100)]);

function run(stage: StageId, d: ExperimentDef, settings: Record<string, PropValue>): Simulation {
  const model = robotModels.stages[stage];
  if (!model) throw new Error(`no ${stage} stage`);
  return model(d, build(settings));
}

function wrong(id: string, d: ExperimentDef, settings: Record<string, PropValue>): Simulation {
  const model = robotModels.wrongModels[id];
  if (!model) throw new Error(`no wrong model ${id}`);
  return model(d, build(settings));
}

const r = (sim: Simulation, key: string) => sim.readings[key];

describe("robot stage: differential drive", () => {
  it("drives straight when both wheels match", () => {
    // v = 10 cm/s for 4 s
    const sim = run("robot", robotDef, { left: 50, right: 50 });
    expect(r(sim, "robot.turn")).toBe(0);
    expect(r(sim, "robot.endX")).toBeCloseTo(0, 6);
    expect(r(sim, "robot.endY")).toBeCloseTo(40, 6);
    expect(r(sim, "robot.distance")).toBeCloseTo(40, 6);
  });

  it("turns left (counter-clockwise) when the right wheel is faster", () => {
    const sim = run("robot", robotDef, { left: 30, right: 80 });
    expect(r(sim, "robot.turn")).toBeCloseTo(190.99, 1);
    expect(r(sim, "robot.distance")).toBeCloseTo(44, 6);
    expect(r(sim, "robot.endX")).toBeCloseTo(-26.16, 2);
    expect(r(sim, "robot.endY")).toBeCloseTo(-2.52, 2);
  });

  it("turns right when the left wheel is faster", () => {
    const sim = run("robot", robotDef, { left: 80, right: 30 });
    expect(r(sim, "robot.turn")).toBeCloseTo(-190.99, 1);
    expect(r(sim, "robot.endX")).toBeCloseTo(26.16, 2);
    expect(r(sim, "robot.endY")).toBeCloseTo(-2.52, 2);
  });

  it("records a path and timeline every 1/30 s from the start to the end point", () => {
    const sim = run("robot", robotDef, { left: 30, right: 80 });
    expect(sim.path).toHaveLength(121);
    expect(sim.path?.[0]).toEqual({ x: 0, y: 0 });
    expect(sim.path?.[120].x).toBeCloseTo(-26.16, 2);
    expect(sim.timeline).toHaveLength(121);
    expect(sim.timeline?.[0]).toEqual({ t: 0, values: { x: 0, y: 0, heading: 0 } });
    const last = sim.timeline?.[120];
    expect(last?.t).toBeCloseTo(4, 9);
    expect(last?.values.heading).toBeCloseTo(190.99, 1);
    expect(last?.values.y).toBeCloseTo(-2.52, 2);
  });

  it("falls back to the controls' starting values when a setting is missing", () => {
    expect(r(run("robot", robotDef, {}), "robot.turn")).toBeCloseTo(190.99, 1);
  });

  it("turns-toward-faster-wheel mirrors the turn", () => {
    const sim = wrong("turns-toward-faster-wheel", robotDef, { left: 30, right: 80 });
    expect(r(sim, "robot.turn")).toBeCloseTo(-190.99, 1);
    expect(r(sim, "robot.endX")).toBeCloseTo(26.16, 2);
    expect(r(sim, "robot.endY")).toBeCloseTo(-2.52, 2);
    expect(r(wrong("turns-toward-faster-wheel", robotDef, { left: 50, right: 50 }), "robot.turn")).toBe(0);
  });
});

describe("gears stage", () => {
  it("slows a 36-tooth output gear to a third of the 12-tooth motor gear, with 3× the torque", () => {
    // 60 rpm × 12 / 36 = 20 rpm; torque 1 × 36 / 12 = 3; meshed gears turn opposite ways
    const sim = run("gears", gearsDef, { driver: 12, driven: 36 });
    expect(r(sim, "driver.rpm")).toBe(60);
    expect(r(sim, "driven.rpm")).toBeCloseTo(20, 9);
    expect(r(sim, "driven.torque")).toBeCloseTo(3, 9);
    expect(r(sim, "gear.ratio")).toBeCloseTo(3, 9);
    expect(r(sim, "driven.direction")).toBe(-1);
  });

  it("speeds up a small output gear", () => {
    // 60 × 36 / 12 = 180 rpm, torque 1/3
    const sim = run("gears", gearsDef, { driver: 36, driven: 12 });
    expect(r(sim, "driven.rpm")).toBeCloseTo(180, 9);
    expect(r(sim, "driven.torque")).toBeCloseTo(1 / 3, 9);
  });

  it("animates both gears: 3 s at 30 frames per second, turning opposite ways", () => {
    const sim = run("gears", gearsDef, { driver: 12, driven: 36 });
    expect(sim.timeline).toHaveLength(91);
    const last = sim.timeline?.[90];
    expect(last?.t).toBeCloseTo(3, 9);
    expect(last?.values.driverAngle).toBeCloseTo(1080, 6);
    expect(last?.values.drivenAngle).toBeCloseTo(-360, 6);
  });

  it("uses the starting teeth when settings are missing", () => {
    expect(r(run("gears", gearsDef, {}), "driven.rpm")).toBeCloseTo(20, 9);
  });

  it("big-gear-faster inverts the speed ratio", () => {
    expect(r(wrong("big-gear-faster", gearsDef, { driver: 12, driven: 36 }), "driven.rpm")).toBeCloseTo(180, 9);
    expect(r(wrong("big-gear-faster", gearsDef, { driver: 12, driven: 8 }), "driven.rpm")).toBeCloseTo(40, 9);
  });

  it("gears-keep-speed keeps the motor's speed and only flips direction", () => {
    const sim = wrong("gears-keep-speed", gearsDef, { driver: 12, driven: 36 });
    expect(r(sim, "driven.rpm")).toBe(60);
    expect(r(sim, "driven.direction")).toBe(-1);
  });
});

describe("pwm stage", () => {
  it("runs the motor smoothly at half speed on a 50 % duty cycle", () => {
    // Average voltage 0.5 × 6 V = 3 V; speed follows it: 0.5 × 200 rpm.
    // 1 kHz switching against a 0.1 s motor time constant: ripple
    // (1 − e^−0.005)² / (1 − e^−0.01) = 0.0025 of full speed.
    const sim = run("pwm", pwmDef, { duty: 50 });
    expect(r(sim, "pwm.duty")).toBe(50);
    expect(r(sim, "pwm.frequency")).toBe(1000);
    expect(r(sim, "motor.avgVoltage")).toBeCloseTo(3, 9);
    expect(r(sim, "motor.maxRpm")).toBe(200);
    expect(r(sim, "motor.rpm")).toBeCloseTo(100, 9);
    expect(r(sim, "motor.speedFraction")).toBeCloseTo(0.5, 9);
    expect(r(sim, "motor.ripple")).toBeCloseTo(0.0025, 5);
  });

  it("runs at full speed with no ripple at 100 %", () => {
    const sim = run("pwm", pwmDef, { duty: 100 });
    expect(r(sim, "motor.speedFraction")).toBe(1);
    expect(r(sim, "motor.ripple")).toBe(0);
  });

  it("spins up smoothly over 2 s, with a slowed-down on/off signal for display", () => {
    const sim = run("pwm", pwmDef, { duty: 20 });
    const frames = sim.timeline ?? [];
    expect(frames).toHaveLength(61);
    const rpm = frames.map((f) => f.values.rpm);
    expect(rpm[0]).toBe(0);
    expect(rpm.every((v, i) => i === 0 || v >= rpm[i - 1])).toBe(true);
    expect(rpm[60]).toBeCloseTo(40, 1);
    const on = frames.slice(0, 60).filter((f) => f.values.signal === 1).length;
    expect(on).toBe(12);
    expect(frames.every((f) => f.values.signal === 0 || f.values.signal === 1)).toBe(true);
  });

  it("uses the starting duty when the setting is missing", () => {
    expect(r(run("pwm", pwmDef, {}), "pwm.duty")).toBe(50);
  });

  it("pwm-stutters has the motor follow every on and off", () => {
    const sim = wrong("pwm-stutters", pwmDef, { duty: 50 });
    expect(r(sim, "motor.ripple")).toBe(1);
    const rpm = (sim.timeline ?? []).map((f) => f.values.rpm);
    expect(Math.max(...rpm.slice(30))).toBeGreaterThan(190);
    expect(Math.min(...rpm.slice(30))).toBeLessThan(10);
    expect(r(wrong("pwm-stutters", pwmDef, { duty: 100 }), "motor.ripple")).toBe(0);
  });

  it("pwm-full-speed runs flat out whenever the signal is ever on", () => {
    const sim = wrong("pwm-full-speed", pwmDef, { duty: 20 });
    expect(r(sim, "motor.speedFraction")).toBe(1);
    expect(r(sim, "motor.rpm")).toBe(200);
    expect(r(sim, "motor.ripple")).toBe(0);
  });
});
