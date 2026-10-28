"use client";

import { IconArrowRight, IconCube, IconMolecule } from "@/components/icons/icons";
import { partInSlot } from "@/engine/edits";
import type { Build, CircuitPartKind, ExperimentDef, Outcome, PropValue } from "@/engine/types";
import { cn } from "@/lib/cn";
import { useLab } from "@/lib/store";
import { labView } from "@/components/lab3d/lab-state";
import { useLabUi } from "@/components/lab3d/lab-ui";
import { Button } from "@/components/ui/Button";
import { PaperCard } from "@/components/ui/PaperCard";
import { Switch } from "@/components/ui/Toggle";
import { PART_NAMES } from "./BuildControls";
import { readingLabel } from "./readings";
import { CountUp } from "@/components/ui/CountUp";
import { useLabBuild, useLabDef } from "./lab-def";
import { GuessTogether } from "@/components/live/GuessTogether";

/*
 * "What's happening" (the inspector, DESIGN.md §7.5 right, CLAUDE.md §3.5): the selected part's
 * ratings and, once a run plays, its live values in Martian Mono; for chemistry
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
      return [["Resistance", formatOhms(typeof props.ohms === "number" ? props.ohms : 220)], ["Can handle", "0.25 W"]];
    case "bulb":
      return [["Resistance", `${props.ohms ?? 12} Ω`], ["Made for", "6 V"]];
    case "led":
      return [["Needs at least", "≈ 2 V"], ["Safe up to", "20 mA"], ["Pointing", props.flipped ? "Backwards" : "The right way"]];
    case "switch":
      return [["Switch", props.closed === false ? "Off (a gap)" : "On (joined up)"]];
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
  if (!slot) return <p className="text-[14px] leading-relaxed text-ink-500">Click a part to see what it’s doing.</p>;
  if (!part) return <p className="text-[14px] leading-relaxed text-ink-500">{slot.label}: empty. Pick a part from the tray. Then click this outline.</p>;
  const r = outcome?.readings ?? {};
  // Easy (grades 6–8) sees just how much flows and how bright it is; voltage and power wait for Medium.
  const easy = def.level === "easy";
  const live: [string, string][] = outcome
    ? [
        [easy ? "Flow (current)" : "Current", fmt(r[`${slot.id}.current`] ?? 0, "A")],
        ...(easy
          ? []
          : ([
              ["Voltage", fmt(r[`${slot.id}.voltage`] ?? 0, "V")],
              ["Power", fmt(r[`${slot.id}.power`] ?? 0, "W")],
            ] as [string, string][])),
        ...(part.kind === "bulb" || part.kind === "led" ? ([["Brightness", fmt(r[`${slot.id}.brightness`] ?? 0, "%")]] as [string, string][]) : []),
      ]
    : [];
  const editable = !slot.fixed && phase === "build";
  return (
    <div className="flex flex-col gap-3">
      <p className="type-heading text-lg">
        {PART_NAMES[part.kind]}
        {/* The slot's name only when it says more than the part's (no "LED · LED"). */}
        {slot.label.toLowerCase() !== PART_NAMES[part.kind].toLowerCase() && <span className="text-[15px] font-medium text-ink-500"> · {slot.label}</span>}
      </p>
      <Rows rows={ratings(part.kind, part.props)} />
      {live.length > 0 && (
        <div>
          <p className="type-label mb-1.5 text-chem-wall">Right now</p>
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

export function Inspector({ className, zoom, live }: { className?: string; zoom: { label: string; caption: string } | null; live: boolean }) {
  const def = useLabDef();
  const build = useLabBuild();
  const result = useLab((s) => s.result);
  const phase = useLab((s) => s.phase);
  const zoomed = useLabUi((s) => s.particles);
  const setZoomed = useLabUi((s) => s.setParticles);
  if (!def || !build) return null;
  const outcome = phase === "build" ? null : (result?.outcome ?? null);
  const final = phase === "result" ? outcome : null;
  const rows = final ? Object.entries(final.readings).map(([key, value]) => ({ key, ...readingLabel(key, value) })).filter((r) => r.label !== null).map((r) => [r.label!, r.text] as [string, string]) : [];
  // Subtraction pass: one small toggle; the readings, Reset view and Guess together wait inside it.
  // Guess together only where live mode can open a room (not on Vercel without Redis).
  return (
    <PaperCard className={cn("flex flex-col gap-4 p-1.5", className)} aria-label="What’s happening" role="complementary">
      <details data-inspector className="group">
        <summary className="inline-flex h-11 cursor-pointer list-none items-center gap-2 rounded-full px-3.5 text-[14px] font-semibold text-ink-900 hover:bg-ink-900/[0.05] [&::-webkit-details-marker]:hidden">
          What’s happening
          <IconArrowRight aria-hidden className="size-3.5 rotate-90 transition-transform duration-200 ease-out-soft group-open:-rotate-90 motion-reduce:transition-none" />
        </summary>
        <div className="flex w-[min(20rem,calc(100vw-3rem))] flex-col gap-4 p-3 pt-2">
      {def.stage === "circuit" ? (
        <CircuitPanel def={def} build={build} outcome={outcome} />
      ) : rows.length ? (
        <Rows rows={rows} />
      ) : (
        <p className="text-[14px] leading-relaxed text-ink-500">{phase === "running" ? "Watch the bench. The numbers show up here when it ends." : "Press Run. The numbers show up here."}</p>
      )}
      <div className="flex flex-wrap gap-2 border-t border-ink-900/[0.07] pt-3">
        {zoom && <Switch label={zoom.label} checked={zoomed} onChange={setZoomed} />}
        <Button variant="ghost" onClick={() => labView.el?.dispatchEvent(new MouseEvent("dblclick"))}>
          <IconCube aria-hidden className="size-4" />
          Reset view
        </Button>
        {live && <GuessTogether def={def} />}
      </div>
      {zoom && zoomed && (
        <p className="flex items-center gap-2 text-[13px] text-ink-500">
          <IconMolecule aria-hidden className="size-4 shrink-0" />
          {zoom.caption}
        </p>
      )}
        </div>
      </details>
    </PaperCard>
  );
}
