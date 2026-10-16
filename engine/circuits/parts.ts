import type { Build, PlacedPart, PropValue } from "../types";

/*
 * Part models for the circuit stage (CLAUDE.md §6.3). Ohms, volts, amps.
 * Values are typical, defensible figures for a classroom kit; sources noted.
 *
 *   battery   EMF `volts` (default 6) behind 0.2 Ω. a = +, b = − (swapped when
 *             props.flipped is true, so "flip the battery" is one prop toggle).
 *   wire      0.01 Ω. Every board/student connection is also a 0.01 Ω wire.
 *   switch    closed (default) = 0.01 Ω, open = not there.
 *   resistor  `ohms` (default 220), rated 0.25 W; heats up with power.
 *   bulb      `ohms` (default 12), a 6 V / 3 W bulb: brightness = P / (6² / R).
 *             Its resistance is held constant (a real filament's rises as it heats).
 *   led       off = open; on = 2.0 V + 5 Ω from anode to cathode. a = anode
 *             unless flipped. Full brightness at 20 mA, lit above 1 mA, burns out above 40 mA.
 *   motor     10 Ω, buzzer 100 Ω; speed / sound = I / (6 V ÷ R), clamped.
 */

export const WIRE_OHMS = 0.01;
/**
 * Internal resistance. A fresh alkaline cell is about 0.15–0.3 Ω (Energizer,
 * "Battery Internal Resistance", 2005), so a 4×AA pack is nearer 0.6–1.2 Ω.
 * We model a stiffer supply (a rechargeable pack or bench supply) so bulbs
 * side by side show the textbook result; at ~1 Ω each extra parallel bulb
 * would visibly dim them all (OpenStax College Physics 2e §21.2).
 */
export const BATTERY_OHMS = 0.2;
export const DEFAULT_BATTERY_VOLTS = 6;
export const DEFAULT_RESISTOR_OHMS = 220;
export const DEFAULT_BULB_OHMS = 12;
export const MOTOR_OHMS = 10;
export const BUZZER_OHMS = 100;
/** Bulbs, motors and buzzers are all rated for a 6 V supply. */
export const RATED_VOLTS = 6;
export const BULB_LIT_BRIGHTNESS = 0.05;
/**
 * Red 5 mm LED: about 1.9–2.0 V across it when lit (Kingbright WP7113ID:
 * VF 1.9 V typical at 10 mA), driven at 10–20 mA, absolute maximum 30 mA DC.
 * Piecewise-linear model: 2.0 V plus 5 Ω once on. We call it burnt out above
 * 40 mA, clearly past the 30 mA maximum ("excess driving current … may result
 * in … premature failure", same datasheet).
 */
export const LED_FORWARD_VOLTS = 2;
export const LED_ON_OHMS = 5;
export const LED_RATED_AMPS = 0.02;
export const LED_LIT_AMPS = 0.001;
export const LED_BURNOUT_AMPS = 0.04;
/** Battery current above this blows the fuse ("short-circuit"). */
export const FUSE_AMPS = 3;
/**
 * Resistors are the common 1/4 W carbon-film kind (KOA Speer CF1/4: 0.25 W
 * at 70 °C ambient, derated to zero at 155 °C). Heating is a rough linear
 * model: room temperature plus about 125 °C per watt, read off KOA's surface
 * temperature rise curve (~+31 °C at full rated power). Capped at 350 °C for
 * display, far past the 155 °C limit. Above 0.25 W: fault `overheat:<slot>`;
 * the resistor keeps conducting.
 */
export const RESISTOR_RATED_WATTS = 0.25;
export const ROOM_CELSIUS = 25;
export const RESISTOR_CELSIUS_PER_WATT = 125;
export const RESISTOR_MAX_CELSIUS = 350;
/** Currents and voltages smaller than this are reported as 0 (gmin leakage is ~1e-8 A). */
export const NOISE = 1e-6;

export const terminalA = (slot: string) => `${slot}.a`;
export const terminalB = (slot: string) => `${slot}.b`;

/** One part per slot (the first one wins), in build order. */
export function placedParts(build: Build): PlacedPart[] {
  const seen = new Set<string>();
  const parts: PlacedPart[] = [];
  for (const part of build.parts) {
    if (seen.has(part.slot)) continue;
    seen.add(part.slot);
    parts.push(part);
  }
  return parts;
}

function finite(value: PropValue | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function batteryVolts(part: PlacedPart): number {
  return finite(part.props.volts, DEFAULT_BATTERY_VOLTS);
}

/** Battery: + terminal. Honours props.flipped. */
export function plusTerminal(part: PlacedPart): string {
  return part.props.flipped === true ? terminalB(part.slot) : terminalA(part.slot);
}

export function minusTerminal(part: PlacedPart): string {
  return part.props.flipped === true ? terminalA(part.slot) : terminalB(part.slot);
}

/** LED: anode terminal. a unless props.flipped. */
export function anodeTerminal(part: PlacedPart): string {
  return part.props.flipped === true ? terminalB(part.slot) : terminalA(part.slot);
}

export function cathodeTerminal(part: PlacedPart): string {
  return part.props.flipped === true ? terminalA(part.slot) : terminalB(part.slot);
}

export function isClosed(part: PlacedPart): boolean {
  return part.props.closed !== false;
}

function ohmsProp(part: PlacedPart, fallback: number): number {
  const value = finite(part.props.ohms, Number.NaN);
  return value > 0 ? Math.max(value, WIRE_OHMS) : fallback;
}

/** Resistance of a resistive part, or null for parts that aren't simple resistors (battery, LED). */
export function partOhms(part: PlacedPart): number | null {
  switch (part.kind) {
    case "wire":
    case "switch":
      return WIRE_OHMS;
    case "resistor":
      return ohmsProp(part, DEFAULT_RESISTOR_OHMS);
    case "bulb":
      return ohmsProp(part, DEFAULT_BULB_OHMS);
    case "motor":
      return ohmsProp(part, MOTOR_OHMS);
    case "buzzer":
      return ohmsProp(part, BUZZER_OHMS);
    case "battery":
    case "led":
      return null;
  }
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Small values are numerical noise: report them as a clean 0. */
export function denoise(x: number): number {
  return Math.abs(x) < NOISE || !Number.isFinite(x) ? 0 : x;
}

/**
 * The readings for one part, from its signed current (a → b through the
 * part) and the voltage V(a) − V(b). See Simulation.readings.
 */
export function partReadings(part: PlacedPart, flow: number, volts: number, burnt: boolean): Record<string, number> {
  const slot = part.slot;
  const current = Math.abs(flow);
  const voltage = Math.abs(volts);
  const power = current * voltage;
  const out: Record<string, number> = {
    [`${slot}.current`]: current,
    [`${slot}.flow`]: flow,
    [`${slot}.voltage`]: voltage,
    [`${slot}.power`]: power,
  };
  switch (part.kind) {
    case "bulb": {
      const ohms = partOhms(part) ?? DEFAULT_BULB_OHMS;
      const brightness = clamp01(power / (RATED_VOLTS ** 2 / ohms));
      out[`${slot}.brightness`] = brightness;
      out[`${slot}.lit`] = brightness > BULB_LIT_BRIGHTNESS ? 1 : 0;
      out[`${slot}.burnt`] = 0;
      break;
    }
    case "led":
      out[`${slot}.brightness`] = burnt ? 0 : clamp01(current / LED_RATED_AMPS);
      out[`${slot}.lit`] = !burnt && current > LED_LIT_AMPS ? 1 : 0;
      out[`${slot}.burnt`] = burnt ? 1 : 0;
      break;
    case "resistor":
      out[`${slot}.temperature`] = Math.min(RESISTOR_MAX_CELSIUS, ROOM_CELSIUS + RESISTOR_CELSIUS_PER_WATT * power);
      out[`${slot}.overheat`] = power > RESISTOR_RATED_WATTS ? 1 : 0;
      break;
    case "switch":
      out[`${slot}.closed`] = isClosed(part) ? 1 : 0;
      break;
    case "motor":
      out[`${slot}.speed`] = clamp01(current / (RATED_VOLTS / (partOhms(part) ?? MOTOR_OHMS)));
      break;
    case "buzzer":
      out[`${slot}.sound`] = clamp01(current / (RATED_VOLTS / (partOhms(part) ?? BUZZER_OHMS)));
      break;
    default:
      break;
  }
  return out;
}

/** `overheat:<slot>` for every resistor whose readings say it's over its rating. */
export function heatFaults(parts: PlacedPart[], readings: Record<string, number>): string[] {
  return parts.filter((p) => p.kind === "resistor" && readings[`${p.slot}.overheat`] === 1).map((p) => `overheat:${p.slot}`);
}
