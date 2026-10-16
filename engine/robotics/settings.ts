import type { Build, ExperimentDef } from "../types";

/** A numeric setting: the build's value, else the slider's starting value, else `fallback`. */
export function numberSetting(def: ExperimentDef, build: Build, id: string, fallback: number): number {
  const value = build.settings[id];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const control = def.controls?.find((c) => c.id === id);
  if (control?.type === "slider") return control.initial;
  return fallback;
}

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
