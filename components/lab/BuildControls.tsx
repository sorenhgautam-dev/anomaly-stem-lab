"use client";

import { IconBlocks } from "@/components/icons/icons";
import { partInSlot } from "@/engine/edits";
import type { CircuitPartKind } from "@/engine/types";
import { cn } from "@/lib/cn";
import { useLab } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { SegmentedToggle } from "@/components/ui/Toggle";

/*
 * The "one thing to change" (CLAUDE.md §2 rule 5). Circuits: the parts tray,
 * the same as the 3D tray on the bench, so keyboards and screen readers can
 * build too: pick a part up, then choose which empty slot it goes in.
 * Chemistry and robots: the experiment's sliders, toggles and choices.
 */

export const PART_NAMES: Record<CircuitPartKind, string> = { battery: "Battery", wire: "Wire", switch: "Switch", resistor: "Resistor", bulb: "Bulb", led: "LED", motor: "Motor", buzzer: "Buzzer" };

function Tray() {
  const def = useLab((s) => s.def)!;
  const build = useLab((s) => s.build)!;
  const armed = useLab((s) => s.armed);
  const arm = useLab((s) => s.arm);
  const place = useLab((s) => s.place);
  const targets = armed ? (def.board?.slots ?? []).filter((s) => !s.fixed && s.accepts.includes(armed)) : [];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Parts tray">
        <span className="mr-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-700">
          <IconBlocks aria-hidden className="size-4" />
          Parts
        </span>
        {def.parts.map((kind) => (
          <Button key={kind} variant={armed === kind ? "primary" : "secondary"} aria-pressed={armed === kind} onClick={() => arm(armed === kind ? null : kind)}>
            {armed === kind ? `Holding the ${PART_NAMES[kind]}` : PART_NAMES[kind]}
          </Button>
        ))}
      </div>
      {armed && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Where the ${PART_NAMES[armed]} goes`}>
          <span className="text-[13px] text-ink-500">Click a glowing outline, or put it in:</span>
          {targets.map((slot) => (
            <Button key={slot.id} variant="ghost" className="bg-volt-100 text-volt-600" onClick={() => place(slot.id)}>
              {slot.label}
              {partInSlot(build, slot.id) ? " (swap)" : ""}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function StageControls() {
  const def = useLab((s) => s.def)!;
  const build = useLab((s) => s.build)!;
  const edit = useLab((s) => s.edit);
  const set = (id: string, value: number | boolean | string) => edit({ op: "set", setting: id, value });
  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
      {def.controls?.map((c) => {
        const value = build.settings[c.id];
        if (c.type === "slider") {
          return <Slider key={c.id} className="min-w-56 flex-1" label={c.label} value={typeof value === "number" ? value : c.initial} min={c.min} max={c.max} step={c.step} unit={c.unit} tint={def.lab === "chemistry" ? "chem" : "robo"} onChange={(v) => set(c.id, v)} />;
        }
        if (c.type === "toggle") {
          return (
            <div key={c.id} className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">{c.label}</span>
              <SegmentedToggle label={c.label} value={value === true ? "on" : "off"} onChange={(v) => set(c.id, v === "on")} options={[{ value: "off", label: c.offLabel }, { value: "on", label: c.onLabel }]} />
            </div>
          );
        }
        return (
          <div key={c.id} className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{c.label}</span>
            <SegmentedToggle label={c.label} value={String(value ?? c.initial)} onChange={(v) => set(c.id, v)} options={c.options} />
          </div>
        );
      })}
    </div>
  );
}

export function BuildControls({ className }: { className?: string }) {
  const def = useLab((s) => s.def);
  if (!def) return null;
  const circuit = def.stage === "circuit" && def.parts.length > 0;
  if (!circuit && !def.controls?.length) return null;
  return <div className={cn(className)}>{circuit ? <Tray /> : <StageControls />}</div>;
}
