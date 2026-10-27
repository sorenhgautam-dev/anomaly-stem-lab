"use client";

import { Atom, Maximize } from "lucide-react";
import { partInSlot } from "@/engine/edits";
import type { Build, CircuitPartKind, ExperimentDef, Outcome, PropValue } from "@/engine/types";
import { cn } from "@/lib/cn";
import { useLab } from "@/lib/store";
import { labView } from "@/components/lab3d/lab-state";
import { useLabUi } from "@/components/lab3d/lab-ui";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Switch } from "@/components/ui/Toggle";
import { PART_NAMES } from "./BuildControls";
import { readingLabel } from "./readings";
import { CountUp } from "@/components/ui/CountUp";

/*
 * The inspector (DESIGN.md §7.5 right, CLAUDE.md §3.5): the selected part's
 * ratings and, once a run plays, its live values in Geist Mono; for chemistry
 * and robots, the readings when the run ends (never during it, so nothing
 * gives the answer away). Also the view tools: zoom to particles, reset view.
 */

const RESISTOR_PRESETS = [10, 100, 220, 470, 1000];
const formatOhms = (ohms: number) => (ohms >= 1000 ? `${ohms / 1000} kΩ` : `${ohms} Ω`);

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
      return [["Resistance", formatOhms(typeof props.ohms === "number" ? props.ohms : 220)], ["Power rating", "0.25 W"]];
    case "bulb":
      return [["Resistance", `${props.ohms ?? 12} Ω`], ["Rated for", "6 V"]];
    case "led":
      return [["Turns on above", "≈ 2 V"], ["Safe current", "20 mA"], ["Pointing", props.flipped ? "Backwards" : "+ to −"]];
    case "switch":
      return [["State", props.closed === false ? "Off (open)" : "On (closed)"]];
    default:
      return [];
  }
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-500">{k}</dt>
          <dd className="type-readout text-right text-ink-900">
            <CountUp text={v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CircuitPanel({ def, build, outcome }: { def: ExperimentDef; build: Build; outcome: Outcome | null }) {
  const selected = useLab((s) => s.selected);
  const phase = useLab((s) => s.phase);
  const edit = useLab((s) => s.edit);
  const slot = selected ? def.board?.slots.find((s) => s.id === selected) : undefined;
  const part = slot ? partInSlot(build, slot.id) : undefined;
  if (!slot) return <p className="text-[14px] leading-relaxed text-ink-500">Click a part on the board to see its values.</p>;
  if (!part) return <p className="text-[14px] leading-relaxed text-ink-500">{slot.label}: empty. Pick a part up from the tray, then click this outline.</p>;
  const r = outcome?.readings ?? {};
  const live: [string, string][] = outcome
    ? [
        ["Current", fmt(r[`${slot.id}.current`] ?? 0, "A")],
        ["Voltage across", fmt(r[`${slot.id}.voltage`] ?? 0, "V")],
        ["Power", fmt(r[`${slot.id}.power`] ?? 0, "W")],
        ...(part.kind === "bulb" || part.kind === "led" ? ([["Brightness", fmt(r[`${slot.id}.brightness`] ?? 0, "%")]] as [string, string][]) : []),
      ]
    : [];
  const editable = !slot.fixed && phase === "build";
  return (
    <div className="flex flex-col gap-3">
      <p className="type-heading text-lg">
        {PART_NAMES[part.kind]} <span className="text-[15px] font-medium text-ink-500">· {slot.label}</span>
      </p>
      <Rows rows={ratings(part.kind, part.props)} />
      {live.length > 0 && (
        <div>
          <p className="type-eyebrow mb-1.5 text-volt-600">Live</p>
          <Rows rows={live} />
        </div>
      )}
      {editable && (
        <div className="flex flex-wrap gap-2">
          {part.kind === "led" && <Button variant="secondary" onClick={() => edit({ op: "toggle-prop", slot: slot.id, prop: "flipped" })}>Flip it round</Button>}
          {part.kind === "switch" && <Button variant="secondary" onClick={() => edit({ op: "toggle-prop", slot: slot.id, prop: "closed" })}>Switch {part.props.closed === false ? "on" : "off"}</Button>}
          {part.kind === "resistor" &&
            RESISTOR_PRESETS.map((ohms) => (
              <Button key={ohms} variant={part.props.ohms === ohms ? "primary" : "secondary"} aria-pressed={part.props.ohms === ohms} onClick={() => edit({ op: "place", slot: slot.id, kind: "resistor", props: { ...part.props, ohms } })}>
                {formatOhms(ohms)}
              </Button>
            ))}
          <Button variant="ghost" onClick={() => edit({ op: "remove", slot: slot.id })}>
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}

export function Inspector({ className, zoom }: { className?: string; zoom: { label: string; caption: string } | null }) {
  const def = useLab((s) => s.def);
  const build = useLab((s) => s.build);
  const result = useLab((s) => s.result);
  const phase = useLab((s) => s.phase);
  const zoomed = useLabUi((s) => s.particles);
  const setZoomed = useLabUi((s) => s.setParticles);
  if (!def || !build) return null;
  const outcome = phase === "build" ? null : (result?.outcome ?? null);
  const final = phase === "result" ? outcome : null;
  const rows = final ? Object.entries(final.readings).map(([key, value]) => ({ key, ...readingLabel(key, value) })).filter((r) => r.label !== null).map((r) => [r.label!, r.text] as [string, string]) : [];
  return (
    <GlassCard className={cn("flex flex-col gap-4 p-4 sm:p-5", className)} aria-label="Inspector" role="complementary">
      <p className="type-eyebrow text-ink-500">Inspector</p>
      {def.stage === "circuit" ? (
        <CircuitPanel def={def} build={build} outcome={outcome} />
      ) : rows.length ? (
        <Rows rows={rows} />
      ) : (
        <p className="text-[14px] leading-relaxed text-ink-500">{phase === "running" ? "Watch the instruments on the bench. The full readings appear here when the run ends." : "Readings appear here when you run the experiment."}</p>
      )}
      <div className="flex flex-wrap gap-2 border-t border-ink-900/[0.07] pt-3">
        {zoom && <Switch label={zoom.label} checked={zoomed} onChange={setZoomed} />}
        <Button variant="ghost" onClick={() => labView.el?.dispatchEvent(new MouseEvent("dblclick"))}>
          <Maximize aria-hidden className="size-4" />
          Reset view
        </Button>
      </div>
      {zoom && zoomed && (
        <p className="flex items-center gap-2 text-[13px] text-ink-500">
          <Atom aria-hidden className="size-4 shrink-0" />
          {zoom.caption}
        </p>
      )}
    </GlassCard>
  );
}
