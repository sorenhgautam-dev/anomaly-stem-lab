"use client";

import type { CircuitPartKind } from "@/engine/types";
import { useLab } from "@/lib/store";
import { CircuitBoard } from "@/components/robotics/CircuitBoard";
import type { DropFn } from "./PartsTray";
import { StageRenderer } from "./stages";

/*
 * The centre of the lab: the experiment itself (CLAUDE.md §3.5), always the
 * visual focus. Picks the renderer for the experiment's stage.
 */
export function StageView({
  armed,
  onPlaced,
  registerDrop,
}: {
  armed: CircuitPartKind | null;
  onPlaced: () => void;
  registerDrop: (fn: DropFn | null) => void;
}) {
  const def = useLab((s) => s.def);
  const build = useLab((s) => s.build);
  const phase = useLab((s) => s.phase);
  const result = useLab((s) => s.result);
  const selected = useLab((s) => s.selected);
  const edit = useLab((s) => s.edit);
  const select = useLab((s) => s.select);
  if (!def || !build) return null;

  const outcome = phase === "build" ? null : (result?.outcome ?? null);
  const ghost = phase === "result" && result?.verdict === "wrong" ? (result.diagnosis?.ghost ?? null) : null;

  if (def.stage === "circuit") {
    return (
      <CircuitBoard
        def={def}
        build={build}
        outcome={outcome}
        ghost={ghost}
        powered={phase !== "build"}
        armed={armed}
        selected={selected}
        onPlace={(slot, kind) => {
          const template = def.board?.slots.find((s) => s.id === slot)?.initial;
          edit({ op: "place", slot, kind, props: template?.kind === kind ? { ...template.props } : undefined });
          select(slot);
          onPlaced();
        }}
        onSelect={select}
        dropTarget={registerDrop}
      />
    );
  }

  return <StageRenderer def={def} build={build} outcome={outcome} ghost={ghost} phase={phase} />;
}
