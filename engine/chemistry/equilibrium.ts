import type { Simulate } from "../types";
import { makeTimeline, numberSetting, settle } from "./common";

/*
 * Stage "equilibrium": a sealed tube of brown nitrogen dioxide in a water bath
 * (experiment "Equilibrium (Le Chatelier)").
 *
 *   2NO2 (brown) ⇌ N2O4 (colourless)    ΔH° = −57.2 kJ/mol (forward gives out heat)
 *
 * The tube starts at room temperature (20 °C) and is put into a water bath at
 * the `temperature` setting (°C).
 *
 * Assumptions (simplified, but honest):
 *  - Ideal gases. Kp = P(N2O4) / P(NO2)² in bar⁻¹ comes from standard data,
 *    ΔH° = −57.2 kJ/mol and ΔS° = −175.9 J/(mol·K): Kp = e^(−(ΔH° − TΔS°)/RT),
 *    about 10 at 20 °C and 0.33 at 70 °C.
 *  - The tube is sealed and rigid. It holds as much nitrogen as 1.7 bar of
 *    pure NO2 would at 20 °C (about 1 bar of the real mix at room temperature).
 *  - The gas reaches equilibrium almost instantly, so at every moment it is at
 *    equilibrium for its current temperature. The tube warms or cools towards
 *    the bath Newton-style and reaches it by the end of the run.
 *  - Brown colour: only NO2 is coloured, so the colour's strength follows the
 *    concentration of NO2. `color` is the share of the tube's nitrogen held as
 *    NO2 (0 = colourless, 1 = all brown NO2), which is in proportion to it.
 *  - The bath is liquid water: 0–100 °C.
 *
 * Readings:
 *   no2.start, no2.end       share of the molecules that are NO2, at 20 °C and at the end
 *   color.start, color.end   brown colour strength, 0..1
 * Timeline values: temperature (°C), no2 (share of molecules), color (0..1).
 *
 * Wrong models:
 *   equilibrium-is-frozen   at equilibrium the reaction has stopped, so
 *                           changing the temperature changes nothing.
 *   heat-pushes-forward     heating always pushes a reaction forward: here
 *                           that means more colourless N2O4 when hot (the
 *                           heat effect reversed, same balance at 20 °C).
 */

type Belief = "real" | "equilibrium-is-frozen" | "heat-pushes-forward";

const DH = -57200; // J/mol, 2NO2 → N2O4
const DS = -175.9; // J/(mol·K)
const R = 8.314;
const KELVIN = 273.15;
const ROOM_C = 20;
const ROOM_K = ROOM_C + KELVIN;
/** Pressure (bar) the tube's nitrogen would give as pure NO2 at 20 °C. */
const FILL_BAR = 1.7;
/** Seconds for the tube to get most of the way to the bath temperature. */
const WARM_TAU = 1.5;

function kp(belief: Belief, kelvin: number): number {
  const atRoom = Math.exp(-(DH - ROOM_K * DS) / (R * ROOM_K));
  // van 't Hoff: ln K changes by −(ΔH/R)(1/T − 1/T_room). The belief flips the sign.
  const sign = belief === "heat-pushes-forward" ? 1 : -1;
  return atRoom * Math.exp((sign * DH * (1 / kelvin - 1 / ROOM_K)) / R);
}

/** The equilibrium mix at `celsius`: NO2's share of the molecules, and the colour. */
function mix(belief: Belief, celsius: number): { no2: number; color: number } {
  const kelvin = celsius + KELVIN;
  const k = kp(belief, kelvin);
  const all = (FILL_BAR * kelvin) / ROOM_K; // bar if every nitrogen were in NO2
  // P(NO2) solves 2K·p² + p − all = 0 (the root written to stay accurate for any K).
  const p = (2 * all) / (1 + Math.sqrt(1 + 8 * k * all));
  const n2o4 = (all - p) / 2;
  return { no2: p / (p + n2o4), color: p / all };
}

function equilibriumModel(belief: Belief): Simulate {
  return (def, build) => {
    const bath = numberSetting(def, build, "temperature", 70, 0, 100);
    const start = mix(belief, ROOM_C);
    const at = (celsius: number) => (belief === "equilibrium-is-frozen" ? start : mix(belief, celsius));

    const timeline = makeTimeline((t) => {
      const temperature = ROOM_C + (bath - ROOM_C) * settle(t, WARM_TAU);
      return { temperature, ...at(temperature) };
    });

    const end = at(bath);
    return {
      readings: {
        "no2.start": start.no2,
        "no2.end": end.no2,
        "color.start": start.color,
        "color.end": end.color,
      },
      faults: [],
      timeline,
    };
  };
}

export const simulateEquilibrium: Simulate = equilibriumModel("real");

export const equilibriumWrongModels: Record<string, Simulate> = {
  "equilibrium-is-frozen": equilibriumModel("equilibrium-is-frozen"),
  "heat-pushes-forward": equilibriumModel("heat-pushes-forward"),
};
