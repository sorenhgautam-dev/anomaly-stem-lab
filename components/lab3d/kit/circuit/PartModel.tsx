"use client";

import type { CircuitPartKind, Outcome, PropValue } from "@/engine/types";
import { Bulb3D, Led3D, type LampState } from "./lamps3d";
import { Buzzer3D, Motor3D } from "./motors3d";
import { Battery3D, Jumper3D, Resistor3D, Switch3D } from "./parts3d";

/* Picks the 3D model for a circuit part, and reads its state from an outcome. */

export interface PartState extends LampState {
  current: number;
}

export const IDLE: PartState = { brightness: 0, burnt: false, current: 0 };

export function partState(outcome: Outcome | null, slot: string): PartState {
  if (!outcome) return IDLE;
  const r = outcome.readings;
  return {
    brightness: r[`${slot}.brightness`] ?? 0,
    burnt: (r[`${slot}.burnt`] ?? 0) > 0.5 || outcome.faults.includes(`burnout:${slot}`),
    current: r[`${slot}.current`] ?? 0,
  };
}

const num = (v: PropValue | undefined, fallback: number) => (typeof v === "number" ? v : fallback);

export function PartModel({ kind, props, half, state, ghost, powered }: { kind: CircuitPartKind; props: Record<string, PropValue>; half: number; state: PartState; ghost: PartState | null; powered: boolean }) {
  switch (kind) {
    case "battery":
      return <Battery3D half={half} volts={num(props.volts, 6)} />;
    case "resistor":
      return <Resistor3D half={half} ohms={num(props.ohms, 220)} />;
    case "wire":
      return <Jumper3D half={half} />;
    case "switch":
      return <Switch3D half={half} props={props} />;
    case "led":
      return <Led3D half={half} flipped={props.flipped === true} state={state} ghost={ghost} powered={powered} />;
    case "bulb":
      return <Bulb3D half={half} state={state} ghost={ghost} powered={powered} />;
    case "motor":
      return <Motor3D half={half} current={state.current} powered={powered} />;
    case "buzzer":
      return <Buzzer3D half={half} current={state.current} powered={powered} />;
  }
}
