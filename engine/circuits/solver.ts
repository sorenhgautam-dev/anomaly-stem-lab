import type { Build, Connection, PlacedPart, Simulation } from "../types";
import { solveNetwork, type Element, type NetworkSolution } from "./mna";
import {
  BATTERY_OHMS,
  FUSE_AMPS,
  LED_BURNOUT_AMPS,
  LED_FORWARD_VOLTS,
  LED_ON_OHMS,
  NOISE,
  WIRE_OHMS,
  anodeTerminal,
  batteryVolts,
  cathodeTerminal,
  denoise,
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

/*
 * Circuit stage: what really happens on the board (CLAUDE.md §6.3).
 * A pure function of the Build; callers cache and re-solve only on change.
 *
 * Nodes are slot terminals ("<slot>.a", "<slot>.b"). Every connection is a
 * 0.01 Ω wire, so each wire's current comes straight out of the solve. Parts
 * follow engine/circuits/parts.ts. Ground is the first battery's − terminal.
 *
 * Steps: settle the LEDs (each is off/open or on = 2 V + 5 Ω; re-solve until
 * every LED agrees with its own voltage and current, ≤ 20 passes) → if the
 * battery current exceeds 3 A the fuse blows → otherwise LEDs over 40 mA burn
 * out and the circuit is re-settled without them.
 *
 * Readings, per occupied slot:
 *   <slot>.current      A, magnitude
 *   <slot>.flow         A, signed: + = conventional current from a to b through the part
 *   <slot>.voltage      V across the part, magnitude
 *   <slot>.power        W
 *   bulbs, LEDs:        <slot>.brightness (0..1)  <slot>.lit (1/0)  <slot>.burnt (1/0)
 *   burnt LEDs:         <slot>.peak (A, the current that burnt it)
 *   resistors:          <slot>.temperature (°C)  <slot>.overheat (1/0)
 *   switches:           <slot>.closed (1/0)
 *   motors / buzzers:   <slot>.speed / <slot>.sound (0..1)
 *   after a short:      fuse.peak (A, the battery current that blew the fuse)
 * Faults: "short-circuit" (fuse blown, every current 0), `burnout:<slot>`,
 *   "open-circuit" (a battery but no current flows even before any burnout),
 *   `overheat:<slot>` (resistor above 0.25 W; it keeps conducting).
 * Flows: every connection, keyed `${from}|${to}` as stored → signed A from → to.
 * Currents and voltages under 1 µA / 1 µV are reported as 0 (gmin leakage).
 */

/** Ways the wrong models bend the real solve (see models.ts). */
export interface CircuitOptions {
  /** LEDs conduct whichever way round they sit. */
  ledEitherWay?: boolean;
  /** LEDs never burn out. */
  noBurnout?: boolean;
  /** Switch slots treated as closed even when they are open. */
  closedSwitches?: ReadonlySet<string>;
  /** Indices into build.connections left out of the solve (their flow reads 0). */
  ignoredConnections?: ReadonlySet<number>;
  /** Wire-part slots left out of the solve. */
  ignoredSlots?: ReadonlySet<string>;
  /** Wires that exist only for this solve. They get no flows entry. */
  extraConnections?: Connection[];
}

type LedMode = "off" | "forward" | "reverse";

const MAX_LED_PASSES = 20;
const SWITCHING_EPS = 1e-9;

const elementId = (slot: string) => `part:${slot}`;

function staticElement(part: PlacedPart, options: CircuitOptions): Element | null {
  const id = elementId(part.slot);
  const a = terminalA(part.slot);
  const b = terminalB(part.slot);
  switch (part.kind) {
    case "battery":
      return { kind: "source", id, from: plusTerminal(part), to: minusTerminal(part), volts: batteryVolts(part), ohms: BATTERY_OHMS };
    case "led":
      return null;
    case "switch":
      return isClosed(part) || options.closedSwitches?.has(part.slot) ? { kind: "resistor", id, from: a, to: b, ohms: WIRE_OHMS } : null;
    case "wire":
      return options.ignoredSlots?.has(part.slot) ? null : { kind: "resistor", id, from: a, to: b, ohms: WIRE_OHMS };
    default: {
      const ohms = partOhms(part);
      return ohms === null ? null : { kind: "resistor", id, from: a, to: b, ohms };
    }
  }
}

function ledElement(led: PlacedPart, mode: LedMode): Element | null {
  if (mode === "off") return null;
  const [from, to] =
    mode === "forward" ? [anodeTerminal(led), cathodeTerminal(led)] : [cathodeTerminal(led), anodeTerminal(led)];
  return { kind: "source", id: elementId(led.slot), from, to, volts: LED_FORWARD_VOLTS, ohms: LED_ON_OHMS };
}

export function solveCircuit(build: Build, options: CircuitOptions = {}): Simulation {
  const parts = placedParts(build);
  const batteries = parts.filter((p) => p.kind === "battery");
  const leds = parts.filter((p) => p.kind === "led");

  const nodes = new Set<string>();
  for (const p of parts) {
    nodes.add(terminalA(p.slot));
    nodes.add(terminalB(p.slot));
  }
  const base: Element[] = [];
  build.connections.forEach((c, i) => {
    if (options.ignoredConnections?.has(i)) return;
    base.push({ kind: "resistor", id: `conn:${i}`, from: c.from, to: c.to, ohms: WIRE_OHMS });
  });
  (options.extraConnections ?? []).forEach((c, i) => {
    base.push({ kind: "resistor", id: `extra:${i}`, from: c.from, to: c.to, ohms: WIRE_OHMS });
  });
  for (const p of parts) {
    const e = staticElement(p, options);
    if (e) base.push(e);
  }
  const ground = batteries.length > 0 ? minusTerminal(batteries[0]) : null;

  const burnt = new Set<string>();
  const solveWith = (modes: Map<string, LedMode>): NetworkSolution => {
    const ledParts = leds.map((l) => ledElement(l, modes.get(l.slot) ?? "off")).filter((e): e is Element => e !== null);
    return solveNetwork([...base, ...ledParts], nodes, ground);
  };

  /** Re-solve until every LED's on/off state matches its voltage and current. */
  const settle = (start: Map<string, LedMode>) => {
    const modes = new Map(start);
    for (const slot of burnt) modes.set(slot, "off");
    let solution = solveWith(modes);
    for (let pass = 0; pass < MAX_LED_PASSES; pass++) {
      let changed = false;
      for (const led of leds) {
        if (burnt.has(led.slot)) continue;
        if ((modes.get(led.slot) ?? "off") === "off") {
          const v = solution.voltage(anodeTerminal(led)) - solution.voltage(cathodeTerminal(led));
          if (v > LED_FORWARD_VOLTS + SWITCHING_EPS) {
            modes.set(led.slot, "forward");
            changed = true;
          } else if (options.ledEitherWay && -v > LED_FORWARD_VOLTS + SWITCHING_EPS) {
            modes.set(led.slot, "reverse");
            changed = true;
          }
        } else if (solution.current(elementId(led.slot)) < -SWITCHING_EPS) {
          modes.set(led.slot, "off");
          changed = true;
        }
      }
      if (!changed) break;
      solution = solveWith(modes);
    }
    return { solution, modes };
  };

  let { solution, modes } = settle(new Map(leds.map((l) => [l.slot, "off" as LedMode])));
  const batteryAmps = Math.max(0, ...batteries.map((b) => Math.abs(solution.current(elementId(b.slot)))));
  const ledAmps = (led: PlacedPart) =>
    (modes.get(led.slot) ?? "off") === "off" ? 0 : Math.abs(solution.current(elementId(led.slot)));

  const faults: string[] = [];
  const peaks = new Map<string, number>();
  const blown = batteryAmps > FUSE_AMPS;
  if (blown) {
    faults.push("short-circuit");
  } else {
    if (!options.noBurnout) {
      for (let round = 0; round < leds.length; round++) {
        const fresh = leds.filter((l) => !burnt.has(l.slot) && ledAmps(l) > LED_BURNOUT_AMPS);
        if (fresh.length === 0) break;
        for (const l of fresh) {
          burnt.add(l.slot);
          peaks.set(l.slot, ledAmps(l));
          faults.push(`burnout:${l.slot}`);
        }
        ({ solution, modes } = settle(modes));
      }
    }
    if (batteries.length > 0 && batteryAmps < NOISE) faults.push("open-circuit");
  }

  /** Signed current a → b through a part. */
  const partFlow = (p: PlacedPart): number => {
    const i = solution.current(elementId(p.slot));
    if (p.kind === "battery") return plusTerminal(p) === terminalA(p.slot) ? i : -i;
    if (p.kind === "led") {
      const mode = modes.get(p.slot) ?? "off";
      if (mode === "off") return 0;
      const from = mode === "forward" ? anodeTerminal(p) : cathodeTerminal(p);
      return from === terminalA(p.slot) ? i : -i;
    }
    return i;
  };

  const readings: Record<string, number> = {};
  for (const p of parts) {
    const flow = blown ? 0 : denoise(partFlow(p));
    const volts = blown ? 0 : denoise(solution.voltage(terminalA(p.slot)) - solution.voltage(terminalB(p.slot)));
    Object.assign(readings, partReadings(p, flow, volts, burnt.has(p.slot)));
    const peak = peaks.get(p.slot);
    if (peak !== undefined) readings[`${p.slot}.peak`] = peak;
  }
  if (blown) readings["fuse.peak"] = batteryAmps;
  faults.push(...heatFaults(parts, readings));

  const flows: Record<string, number> = {};
  build.connections.forEach((c, i) => {
    flows[`${c.from}|${c.to}`] = blown ? 0 : denoise(solution.current(`conn:${i}`));
  });

  return { readings, faults, flows };
}
