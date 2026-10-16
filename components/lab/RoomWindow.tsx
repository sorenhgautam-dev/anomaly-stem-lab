"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useRoomReady, useRoomWindow } from "@/components/labroom/room-state";
import { LevelMiniMap } from "./LevelMiniMap";
import { WindowTicker } from "./WindowTicker";

/*
 * The experiment's window into the 3D lab (CLAUDE.md §3.6.2). The room's
 * camera locks onto this box, so the 2D apparatus drawn here stands in the
 * fume hood (chemistry) or on the holo board (robotics). Until the room is
 * up, or if WebGL is unavailable, it falls back to a plain panel. Once the
 * room is ready the stage's own SVG bench line hides: the 3D bench takes
 * its place.
 */
export function RoomWindow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useRoomWindow(ref);
  const ready = useRoomReady((s) => s.ready);

  return (
    <section
      ref={ref}
      aria-label="Experiment"
      className={cn(
        "relative min-h-[46vh] rounded-[26px] border transition-[background-color,border-color] duration-700 ease-lab",
        ready ? "border-transparent bg-transparent [&_[data-bench]]:invisible" : "border-pearl/8 bg-pearl/[0.02]",
      )}
    >
      <div className="absolute inset-0 p-2 sm:p-4">{children}</div>
      <WindowTicker />
      {/* Inset past the holo board's corner brackets. */}
      <LevelMiniMap className="absolute right-14 top-3" />
    </section>
  );
}
