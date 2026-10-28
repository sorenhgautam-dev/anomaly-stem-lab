import { describe, expect, it } from "vitest";
import { initialBuild } from "@/engine/edits";
import { realModel } from "@/engine/registry";
import { simulateOutcome } from "@/engine/run";
import type { Build, ExperimentDef } from "@/engine/types";
import { ALL_EXPERIMENTS, EXPERIMENTS } from "@/lib/content";
import { formatReadout } from "@/lib/readout";
import { applyWhatIf, usefulWhatIfs, whatIfLine, whatIfsFor } from "@/lib/what-if";

const run = (def: ExperimentDef, build: Build) => simulateOutcome(def, build, realModel(def.stage));

describe("What if? content", () => {
  it.each(EXPERIMENTS.map((e) => [e.id, e] as const))("%s has 2 or 3 variations that change the build and stay inside the model", (_id, def) => {
    const variants = whatIfsFor(def.id);
    expect(variants.length).toBeGreaterThanOrEqual(2);
    expect(variants.length).toBeLessThanOrEqual(3);
    const start = initialBuild(def);
    // At least two must be offered on the starting build.
    expect(usefulWhatIfs(def.id, start).length).toBeGreaterThanOrEqual(1);
    for (const v of variants) {
      expect(v.label).not.toMatch(/—/);
      for (const edit of v.edits) {
        if (edit.op === "set") {
          // A setting without a control (e.g. when protection goes on) is fine: the model reads it directly.
          const control = def.controls?.find((c) => c.id === edit.setting);
          if (control?.type === "slider") {
            expect(typeof edit.value).toBe("number");
            expect(edit.value as number).toBeGreaterThanOrEqual(control.min);
            expect(edit.value as number).toBeLessThanOrEqual(control.max);
            // On the slider's own steps, so the slider can show it.
            expect(Math.abs(((edit.value as number) - control.min) / control.step - Math.round(((edit.value as number) - control.min) / control.step))).toBeLessThan(1e-9);
          }
          if (control?.type === "choice") expect(control.options.map((o) => o.value)).toContain(edit.value);
          if (control?.type === "toggle") expect(typeof edit.value).toBe("boolean");
        } else if ("slot" in edit) {
          const slot = def.board?.slots.find((s) => s.id === edit.slot);
          expect(slot, `${v.id}: no slot ${edit.slot}`).toBeDefined();
          if (edit.op === "place") expect(slot!.accepts).toContain(edit.kind);
        }
      }
      const outcome = run(def, applyWhatIf(start, v));
      for (const r of v.show) expect(Number.isFinite(outcome.readings[r.key]), `${def.id} ${v.id}: ${r.key}`).toBe(true);
    }
  });
});

describe("Ano's What if? reaction", () => {
  it("uses the simulator's numbers from both runs", () => {
    const def = ALL_EXPERIMENTS.find((e) => e.id === "chemistry-sealed-bag")!;
    const start = initialBuild(def);
    const seal = whatIfsFor(def.id).find((v) => v.id === "seal-bag")!;
    const before = run(def, start).readings;
    const after = run(def, applyWhatIf(start, seal)).readings;
    const line = whatIfLine(seal, before, after);
    expect(line).toContain(formatReadout(before["scale.end"], seal.show[0]));
    expect(line).toContain(formatReadout(after["scale.end"], seal.show[0]));
    expect(line).toMatch(/^Seal the bag: the scale at the end went from 127\.51 g to 130\.00 g\./);
  });

  it("says 'stayed at' only when the shown numbers are equal", () => {
    const def = ALL_EXPERIMENTS.find((e) => e.id === "chemistry-melting")!;
    const start = initialBuild(def);
    const full = whatIfsFor(def.id).find((v) => v.id === "full-power")!;
    const line = whatIfLine(full, run(def, start).readings, run(def, applyWhatIf(start, full)).readings);
    expect(line).toBe("Heater on full (200 W): the thermometer while the ice melted stayed at 0.0 °C. Did you guess that?");
  });

  it("hides a variation that wouldn't change anything", () => {
    const def = ALL_EXPERIMENTS.find((e) => e.id === "chemistry-sealed-bag")!;
    const open = initialBuild(def);
    expect(usefulWhatIfs(def.id, open).map((v) => v.id)).not.toContain("open-bag");
    const sealed = applyWhatIf(open, whatIfsFor(def.id).find((v) => v.id === "seal-bag")!);
    expect(usefulWhatIfs(def.id, sealed).map((v) => v.id)).toContain("open-bag");
  });
});
