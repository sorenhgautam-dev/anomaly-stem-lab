import type { Simulate, Simulation, TimelineFrame } from "../types";
import { clamp, numberSetting } from "./settings";

/*
 * PWM stage: a small DC gear motor on a 6 V supply that a controller switches
 * on and off 1000 times a second (pulse-width modulation).
 *
 * Setting: `duty` = % of each cycle the supply is on.
 * The average voltage is duty × 6 V (Microchip AN905: V_avg = D × V_supply,
 * speed roughly proportional to duty). The coil's inductance smooths the
 * current and the rotor's inertia smooths the speed; we lump both into one
 * first-order lag (time constant 0.1 s, a modelling choice for a small geared
 * motor), so at 1 kHz it settles at maxRpm × duty with a ripple far too small
 * to see. Much slower switching would make a real motor jerk. Real motors also
 * need a little voltage to overcome friction; this model leaves that out.
 * Max speed: a "TT" gear motor, 200 rpm ±10% at 6 V no load (Adafruit 3777).
 * 1 kHz sits in the usual range (Arduino Uno PWM is 490/980 Hz; AN905 suggests 4–20 kHz).
 * Steady ripple (peak to peak, fraction of max) for duty D, period T, lag τ:
 *   (1 − e^(−DT/τ)) (1 − e^(−(1−D)T/τ)) / (1 − e^(−T/τ))
 *
 * Readings:
 *   pwm.duty             % (as set)
 *   pwm.frequency        switching frequency, Hz
 *   motor.avgVoltage     V
 *   motor.rpm            steady speed
 *   motor.maxRpm         speed at a steady 6 V (no load)
 *   motor.speedFraction  motor.rpm ÷ motor.maxRpm
 *   motor.ripple         steady peak-to-peak speed swing ÷ motor.maxRpm
 * timeline: 2 s at 30 frames per second, values
 *   signal   1 = supply on, 0 = off. Slowed down to 2 cycles a second so it can
 *            be seen; the real signal switches 1000 times a second.
 *   rpm      motor speed, spinning up from rest
 *   angle    shaft angle in degrees, for animating the wheel
 */

export const SUPPLY_VOLTS = 6;
export const PWM_HZ = 1000;
export const MAX_RPM = 200;
export const MOTOR_LAG_SECONDS = 0.1;
export const PWM_SECONDS = 2;
export const PWM_FRAMES_PER_SECOND = 30;
/** How fast the timeline's `signal` cycles, so the eye can follow it. */
export const DISPLAY_HZ = 2;
/** How fast the motor stops and starts in the stutter belief. */
const STUTTER_LAG_SECONDS = 0.03;

/** What a model thinks the motor does with a PWM signal. */
export type PwmRule = "real" | "stutters" | "full-speed";

/** The slowed-down display signal at time t. */
function displaySignal(duty: number, t: number): number {
  if (duty >= 1) return 1;
  if (duty <= 0) return 0;
  const phase = (t * DISPLAY_HZ) % 1;
  return phase < duty - 1e-9 ? 1 : 0;
}

/** Steady peak-to-peak speed ripple of a first-order motor under PWM, as a fraction of max. */
export function pwmRipple(duty: number, hz: number, lag: number): number {
  const period = 1 / hz;
  const on = Math.exp((-duty * period) / lag);
  const off = Math.exp((-(1 - duty) * period) / lag);
  return ((1 - on) * (1 - off)) / (1 - on * off);
}

export function runPwm(dutyPercent: number, rule: PwmRule = "real"): Simulation {
  const percent = clamp(dutyPercent, 0, 100);
  const duty = percent / 100;
  const believesFull = rule === "full-speed" && duty > 0;
  const steadyFraction = believesFull ? 1 : duty;
  const ripple = rule === "stutters" ? (duty > 0 && duty < 1 ? 1 : 0) : rule === "real" ? pwmRipple(duty, PWM_HZ, MOTOR_LAG_SECONDS) : 0;

  const timeline: TimelineFrame[] = [];
  const dt = 1 / PWM_FRAMES_PER_SECOND;
  let rpm = 0;
  let angle = 0;
  for (let frame = 0; frame <= PWM_SECONDS * PWM_FRAMES_PER_SECOND; frame++) {
    const t = frame / PWM_FRAMES_PER_SECOND;
    const signal = displaySignal(duty, t);
    if (rule === "stutters") {
      if (frame > 0) {
        // The belief: the motor follows each on and off, held over the last frame.
        const target = MAX_RPM * displaySignal(duty, t - dt);
        const next = target + (rpm - target) * Math.exp(-dt / STUTTER_LAG_SECONDS);
        angle += ((rpm + next) / 2) * 6 * dt;
        rpm = next;
      }
    } else {
      // Inertia averages the fast pulses: a smooth spin-up toward the steady speed.
      const steady = MAX_RPM * steadyFraction;
      rpm = steady * (1 - Math.exp(-t / MOTOR_LAG_SECONDS));
      angle = 6 * steady * (t - MOTOR_LAG_SECONDS * (1 - Math.exp(-t / MOTOR_LAG_SECONDS)));
    }
    timeline.push({ t, values: { signal, rpm, angle } });
  }

  return {
    readings: {
      "pwm.duty": percent,
      "pwm.frequency": PWM_HZ,
      "motor.avgVoltage": (believesFull ? 1 : duty) * SUPPLY_VOLTS,
      "motor.rpm": MAX_RPM * steadyFraction,
      "motor.maxRpm": MAX_RPM,
      "motor.speedFraction": steadyFraction,
      "motor.ripple": ripple,
    },
    faults: [],
    timeline,
  };
}

const dutyOf = (...args: Parameters<Simulate>) => numberSetting(args[0], args[1], "duty", 50);

export const realPwm: Simulate = (def, build) => runPwm(dutyOf(def, build));

/*
 * pwm-stutters    Fast switching makes the motor stop and start: it follows
 *                 every on and off (ripple = 1 whenever 0 < duty < 100 %).
 * pwm-full-speed  Any "on" signal means full speed: the motor runs flat out
 *                 (and sees the full 6 V) whenever the duty is above 0.
 */
export const pwmWrongModels: Record<string, Simulate> = {
  "pwm-stutters": (def, build) => runPwm(dutyOf(def, build), "stutters"),
  "pwm-full-speed": (def, build) => runPwm(dutyOf(def, build), "full-speed"),
};
