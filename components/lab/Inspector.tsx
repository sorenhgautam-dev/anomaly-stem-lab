"use client";

import { partInSlot } from "@/engine/edits";
import type { CircuitPartKind, ExperimentDef, Outcome, PropValue } from "@/engine/types";
import { cn } from "@/lib/cn";
import { useLab } from "@/lib/store";
import { formatOhms, PART_NAMES } from "@/components/robotics/parts";
import { readingLabel } from "./readings";

/*
 * Right panel (CLAUDE.md §3.5): the selected part's live values. Before a
 * run it shows the part's ratings only, so it never gives the answer away.
 */

const RESISTOR_PRESETS = [10, 100, 220, 470, 1000];

function fmt(value: number, unit: string): string {
  const abs = Math.abs(value);
  if (unit === "A") return abs < 1 ? `${(value * 1000).toFixed(abs < 0.01 ? 2 : 1)} mA` : `${value.toFixed(2)} A`;
  if (unit === "W") return abs < 1 ? `${(value * 1000).toFixed(0)} mW` : `${value.toFixed(2)} W`;
  if (unit === "%") return `${Math.round(value * 100)} %`;
  return `${value.toFixed(2)} ${unit}`;
}

function ratings(kind: CircuitPartKind, props: Record<string, PropValue>): [string, string][] {
  switch (kind) {
    case "battery":
      return [["Voltage", `${props.volts ?? 6} V`]];
    case "resistor":
      return [
        ["Resistance", formatOhms(typeof props.ohms === "number" ? props.ohms : 220)],
        ["Power rating", "0.25 W"],
      ];
    case "bulb":
      return [
        ["Resistance", `${props.ohms ?? 12} Ω`],
        ["Rated for", "6 V"],
      ];
    case "led":
      return [
        ["Turns on above", "≈ 2 V"],
        ["Safe current", "20 mA"],
        ["Pointing", props.flipped ? "Backwards" : "+ to −"],
      ];
    case "switch":
      return [["State", props.closed === false ? "Off (open)" : "On (closed)"]];
    default:
      return [];
  }
}

export function Inspector({ className }: { className?: string }) {
  const def = useLab((s) => s.def);
  const build = useLab((s) => s.build);
  const selected = useLab((s) => s.selected);
  const result = useLab((s) => s.result);
  const phase = useLab((s) => s.phase);
  const edit = useLab((s) => s.edit);
  if (!def || !build) return null;

  const outcome = phase === "build" ? null : (result?.outcome ?? null);

  return (
    <aside className={cn("glass flex flex-col gap-4 rounded-[20px] p-5", className)} aria-label="Inspector">
      <p className="type-label text-pearl/45">Inspector</p>
      {def.stage === "circuit" ? (
        <CircuitInspector def={def} selected={selected} outcome={outcome} build={build} edit={edit} />
      ) : (
        // Final readings only once the verdict is in: during the run they'd
        // give the answer away before the student sees it happen.
        <ReadingsTable outcome={phase === "result" ? outcome : null} running={phase === "running"} />
      )}
    </aside>
  );
}

function CircuitInspector({
  def,
  selected,
  outcome,
  build,
  edit,
}: {
  def: ExperimentDef;
  selected: string | null;
  outcome: Outcome | null;
  build: NonNullable<ReturnType<typeof useLab.getState>["build"]>;
  edit: ReturnType<typeof useLab.getState>["edit"];
}) {
  const slot = selected ? def.board?.slots.find((s) => s.id === selected) : undefined;
  const part = slot ? partInSlot(build, slot.id) : undefined;
  if (!slot) {
    return <p className="text-[14px] leading-relaxed text-pearl/60">Select a part on the board to see its values.</p>;
  }
  if (!part) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[17px] text-pearl">{slot.label}</p>
        <p className="text-[14px] leading-relaxed text-pearl/60">Empty. Pick a part in the tray, then click this outline to snap it in.</p>
      </div>
    );
  }
  const r = outcome?.readings ?? {};
  const live: [string, string][] = outcome
    ? [
        ["Current", fmt(r[`${slot.id}.current`] ?? 0, "A")],
        ["Voltage across", fmt(r[`${slot.id}.voltage`] ?? 0, "V")],
        ["Power", fmt(r[`${slot.id}.power`] ?? 0, "W")],
        ...(part.kind === "bulb" || part.kind === "led"
          ? ([["Brightness", fmt(r[`${slot.id}.brightness`] ?? 0, "%")]] as [string, string][])
          : []),
        ...(r[`${slot.id}.temperature`] !== undefined
          ? ([["Temperature", `${Math.round(r[`${slot.id}.temperature`])} °C`]] as [string, string][])
          : []),
      ]
    : [];

  const action = "rounded-full px-3 py-2 text-[13px] transition-colors duration-200 ease-lab";
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[17px] text-pearl">
        {PART_NAMES[part.kind]} <span className="text-pearl/45">· {slot.label}</span>
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
        {ratings(part.kind, part.props).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-pearl/50">{k}</dt>
            <dd className="text-right font-mono text-pearl">{v}</dd>
          </div>
        ))}
      </dl>
      {live.length > 0 && (
        <div>
          <p className="type-label mb-2 text-signal">Live</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
            {live.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-pearl/50">{k}</dt>
                <dd className="text-right font-mono text-pearl">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {!slot.fixed && (
        <div className="flex flex-wrap gap-2">
          {part.kind === "led" && (
            <button type="button" className={cn(action, "glass text-pearl hover:bg-pearl/15")} onClick={() => edit({ op: "toggle-prop", slot: slot.id, prop: "flipped" })}>
              Flip it round
            </button>
          )}
          {part.kind === "switch" && (
            <button type="button" className={cn(action, "glass text-pearl hover:bg-pearl/15")} onClick={() => edit({ op: "toggle-prop", slot: slot.id, prop: "closed" })}>
              Switch {part.props.closed === false ? "on" : "off"}
            </button>
          )}
          {part.kind === "resistor" &&
            RESISTOR_PRESETS.map((ohms) => (
              <button
                key={ohms}
                type="button"
                aria-pressed={part.props.ohms === ohms}
                className={cn(action, part.props.ohms === ohms ? "bg-pearl text-void" : "glass text-pearl hover:bg-pearl/15")}
                onClick={() => edit({ op: "place", slot: slot.id, kind: "resistor", props: { ...part.props, ohms } })}
              >
                {formatOhms(ohms)}
              </button>
            ))}
          <button type="button" className={cn(action, "text-pearl/60 hover:bg-pearl/10 hover:text-pearl")} onClick={() => edit({ op: "remove", slot: slot.id })}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function ReadingsTable({ outcome, running }: { outcome: Outcome | null; running: boolean }) {
  if (!outcome) {
    return (
      <p className="text-[14px] leading-relaxed text-pearl/60">
        {running ? "Watch the instruments on the bench. The full readings appear here when the run ends." : "Readings appear here when you run the experiment."}
      </p>
    );
  }
  const rows = Object.entries(outcome.readings)
    .map(([key, value]) => ({ key, ...readingLabel(key, value) }))
    .filter((r) => r.label !== null);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
      {rows.map((r) => (
        <div key={r.key} className="contents">
          <dt className="text-pearl/50">{r.label}</dt>
          <dd className="text-right font-mono text-pearl">{r.text}</dd>
        </div>
      ))}
    </dl>
  );
}
