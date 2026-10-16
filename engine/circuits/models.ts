import type { Build, Connection, PlacedPart, Simulate, Simulation } from "../types";
import {
  BATTERY_OHMS,
  DEFAULT_BULB_OHMS,
  DEFAULT_RESISTOR_OHMS,
  NOISE,
  batteryVolts,
  heatFaults,
  isClosed,
  minusTerminal,
  partOhms,
  partReadings,
  placedParts,
  plusTerminal,
  terminalA,
  terminalB,
} from "./parts";
import { solveCircuit } from "./solver";
import { firstBattery, hops, links, seriesBulbGroups, slotHops, wireBridges } from "./topology";

/*
 * Circuit models: the real one, and one wrong model per misconception
 * (CLAUDE.md §6.2). Every wrong model is the real solve bent by one mistaken
 * rule, so its Simulation (the "ghost") uses the same readings as reality.
 *
 *  led-any-direction        LEDs work either way round: an LED conducts in
 *                           whichever direction the voltage pushes (still
 *                           needs 2 V, still burns out). `flipped` is ignored.
 *  no-resistor-needed       More current just makes an LED brighter: LEDs never
 *                           burn out; brightness clamps at 1.
 *  current-used-up          Each bulb uses up current: solve for real, then in
 *                           each series chain of bulbs (ordered by hops from
 *                           the battery's + terminal) keep the first bulb as
 *                           solved and halve each later one (×0.5, ×0.25, …).
 *                           Wire flows stay as solved.
 *  battery-constant-current A battery always pushes the current it would push
 *                           through one bulb, I0 = V / (R_bulb + r): scale every
 *                           current so the battery delivers I0, so n parallel
 *                           bulbs get I0 / n each.
 *  switch-only-positive     A switch only works on the + side: an open switch
 *                           fewer hops from the − terminal than from the +
 *                           terminal acts closed (its `closed` reading stays 0).
 *  short-harmless           A wire across a part changes nothing: wires and
 *                           wire parts that bridge one part's own terminals
 *                           are left out of the solve (their current reads 0).
 *  one-wire-enough          One wire from + lights a bulb: a dark bulb reached
 *                           from the + terminal at one end only gets a phantom
 *                           wire from its other end back to −. Flows cover the
 *                           real wires only.
 *  more-resistance-more-heat The same current flows whatever the resistance:
 *                           every resistor carries the current it would carry
 *                           at 100 Ω, so its power is I² × R and grows with R.
 */

export const realCircuit: Simulate = (_def, build) => solveCircuit(build);

/** Scale part currents and voltages, re-derive their readings, and refresh overheat faults. */
function rescale(
  build: Build,
  sim: Simulation,
  factor: (part: PlacedPart) => { current: number; voltage: number },
  flowFactor = 1,
): Simulation {
  const parts = placedParts(build);
  const readings = { ...sim.readings };
  for (const p of parts) {
    const f = factor(p);
    if (f.current === 1 && f.voltage === 1) continue;
    const flow = (sim.readings[`${p.slot}.flow`] ?? 0) * f.current;
    const volts = (sim.readings[`${p.slot}.voltage`] ?? 0) * f.voltage;
    Object.assign(readings, partReadings(p, flow, volts, sim.readings[`${p.slot}.burnt`] === 1));
  }
  const flows: Record<string, number> = {};
  for (const [key, value] of Object.entries(sim.flows ?? {})) flows[key] = value * flowFactor;
  const faults = [...sim.faults.filter((f) => !f.startsWith("overheat:")), ...heatFaults(parts, readings)];
  return { ...sim, readings, flows, faults };
}

const currentUsedUp: Simulate = (_def, build) => {
  const sim = solveCircuit(build);
  const battery = firstBattery(build);
  if (!battery) return sim;
  const fromPlus = hops(links(build, (p) => p.kind !== "battery"), plusTerminal(battery));
  const share = new Map<string, number>();
  for (const chain of seriesBulbGroups(build, sim)) {
    const ordered = [...chain].sort((x, y) => slotHops(fromPlus, x) - slotHops(fromPlus, y));
    ordered.forEach((slot, i) => share.set(slot, 0.5 ** i));
  }
  // Brightness ∝ power = I × V, so scale both by √share.
  return rescale(build, sim, (p) => {
    const s = Math.sqrt(share.get(p.slot) ?? 1);
    return { current: s, voltage: s };
  });
};

const batteryConstantCurrent: Simulate = (_def, build) => {
  const sim = solveCircuit(build);
  const battery = firstBattery(build);
  const actual = battery ? (sim.readings[`${battery.slot}.current`] ?? 0) : 0;
  const bulb = placedParts(build).find((p) => p.kind === "bulb" && (sim.readings[`${p.slot}.current`] ?? 0) > NOISE);
  if (!battery || !bulb || actual < NOISE) return sim;
  const i0 = Math.abs(batteryVolts(battery)) / ((partOhms(bulb) ?? DEFAULT_BULB_OHMS) + BATTERY_OHMS);
  const k = i0 / actual;
  return rescale(build, sim, (p) => (p.kind === "battery" ? { current: k, voltage: 1 } : { current: k, voltage: k }), k);
};

const switchOnlyPositive: Simulate = (_def, build) => {
  const battery = firstBattery(build);
  if (!battery) return solveCircuit(build);
  const graph = links(build, (p) => p.kind !== "battery");
  const fromPlus = hops(graph, plusTerminal(battery));
  const fromMinus = hops(graph, minusTerminal(battery));
  const closedSwitches = new Set(
    placedParts(build)
      .filter((p) => p.kind === "switch" && !isClosed(p) && slotHops(fromMinus, p.slot) < slotHops(fromPlus, p.slot))
      .map((p) => p.slot),
  );
  return solveCircuit(build, { closedSwitches });
};

const shortHarmless: Simulate = (_def, build) => {
  const { connections, slots } = wireBridges(build);
  return solveCircuit(build, { ignoredConnections: connections, ignoredSlots: slots });
};

const oneWireEnough: Simulate = (_def, build) => {
  const sim = solveCircuit(build);
  const battery = firstBattery(build);
  if (!battery) return sim;
  const phantom: Connection[] = [];
  for (const bulb of placedParts(build)) {
    if (bulb.kind !== "bulb" || sim.readings[`${bulb.slot}.lit`] === 1) continue;
    const graph = links(
      build,
      (p) => p.kind !== "battery" && p.slot !== bulb.slot && !(p.kind === "switch" && !isClosed(p)),
    );
    const reach = hops(graph, plusTerminal(battery));
    const fromA = reach.has(terminalA(bulb.slot));
    const fromB = reach.has(terminalB(bulb.slot));
    if (fromA === fromB) continue;
    phantom.push({ from: fromA ? terminalB(bulb.slot) : terminalA(bulb.slot), to: minusTerminal(battery) });
  }
  return phantom.length === 0 ? sim : solveCircuit(build, { extraConnections: phantom });
};

const BELIEVED_OHMS = 100;

const moreResistanceMoreHeat: Simulate = (_def, build) => {
  const parts = placedParts(build);
  const resistors = parts.filter((p) => p.kind === "resistor");
  if (resistors.length === 0) return solveCircuit(build);
  const at100: Build = {
    ...build,
    parts: build.parts.map((p) => (p.kind === "resistor" ? { ...p, props: { ...p.props, ohms: BELIEVED_OHMS } } : p)),
  };
  const sim = solveCircuit(at100);
  const readings = { ...sim.readings };
  for (const p of resistors) {
    const flow = sim.readings[`${p.slot}.flow`] ?? 0;
    Object.assign(readings, partReadings(p, flow, flow * (partOhms(p) ?? DEFAULT_RESISTOR_OHMS), false));
  }
  const faults = [...sim.faults.filter((f) => !f.startsWith("overheat:")), ...heatFaults(parts, readings)];
  return { ...sim, readings, faults };
};

export const circuitWrongModels: Record<string, Simulate> = {
  "led-any-direction": (_def, build) => solveCircuit(build, { ledEitherWay: true }),
  "no-resistor-needed": (_def, build) => solveCircuit(build, { noBurnout: true }),
  "current-used-up": currentUsedUp,
  "battery-constant-current": batteryConstantCurrent,
  "switch-only-positive": switchOnlyPositive,
  "short-harmless": shortHarmless,
  "one-wire-enough": oneWireEnough,
  "more-resistance-more-heat": moreResistanceMoreHeat,
};
