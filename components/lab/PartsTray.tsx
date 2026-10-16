"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { CircuitPartKind } from "@/engine/types";
import { cn } from "@/lib/cn";
import { PART_NAMES, PartIcon } from "@/components/robotics/parts";

/*
 * The parts tray: only the parts this experiment needs (CLAUDE.md §2 rule 5).
 * Click a part, then click a glowing outline (works with the keyboard too),
 * or drag it straight onto the board.
 */

export type DropFn = (clientX: number, clientY: number, kind: CircuitPartKind) => boolean;

export function PartsTray({
  parts,
  armed,
  onArm,
  drop,
}: {
  parts: CircuitPartKind[];
  armed: CircuitPartKind | null;
  onArm: (kind: CircuitPartKind | null) => void;
  drop: () => DropFn | null;
}) {
  const ghost = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: CircuitPartKind; x: number; y: number; moved: boolean } | null>(null);

  const down = (kind: CircuitPartKind) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    drag.current = { kind, x: e.clientX, y: e.clientY, moved: false };
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      if (!d.moved && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 6) {
        d.moved = true;
        onArm(kind);
      }
      if (d.moved && ghost.current) {
        ghost.current.style.opacity = "1";
        ghost.current.style.transform = `translate3d(${ev.clientX - 36}px, ${ev.clientY - 24}px, 0)`;
      }
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const d = drag.current;
      drag.current = null;
      if (ghost.current) ghost.current.style.opacity = "0";
      if (d?.moved) {
        const placed = drop()?.(ev.clientX, ev.clientY, d.kind) ?? false;
        if (placed) onArm(null);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (parts.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="type-label text-pearl/45">Parts</p>
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Parts tray">
        {parts.map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={armed === kind}
            onPointerDown={down(kind)}
            onClick={() => {
              if (!drag.current?.moved) onArm(armed === kind ? null : kind);
            }}
            className={cn(
              "flex touch-none items-center gap-1 rounded-2xl py-1.5 pl-1 pr-3.5 text-[14px] transition-colors duration-200 ease-lab",
              armed === kind ? "bg-lilac/20 text-pearl ring-1 ring-lilac" : "glass text-pearl/85 hover:bg-pearl/12",
            )}
          >
            <PartIcon kind={kind} />
            {PART_NAMES[kind]}
          </button>
        ))}
      </div>
      <div ref={ghost} aria-hidden className="pointer-events-none fixed left-0 top-0 z-50 rounded-2xl bg-void/80 p-2 opacity-0 ring-1 ring-lilac">
        {armed && <PartIcon kind={armed} />}
      </div>
    </div>
  );
}
