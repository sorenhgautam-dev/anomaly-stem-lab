"use client";

import { cn } from "@/lib/cn";
import { LAB } from "@/lib/tokens";
import { MicroscopeCells, MicroscopeView } from "@/components/lab3d/kit/bio/Microscope";
import type { HowBench } from "./how-sequence";

/*
 * How it works' bench (DESIGN.md §7.1 item 2): the real chemo experiment's
 * three kinds of cells, each seen down its own microscope, each at the
 * engine's value for the step. Colonies ease between steps, so scrolling
 * plays the experiment. In Reveal a see-through colony in the hair view
 * shows the guess's idea beside what really happened. The three eyepieces
 * fill the panel: no empty floor.
 */

const ROOM = 48;
const cells = (pct: number) => (pct / 100) * ROOM * 1.1;

export function HowChemo3D({ bench, label, className }: { bench: HowBench; label: string; className?: string }) {
  const groups = [
    { key: "cancer", title: "Cancer cells", value: bench.dishes.cancer, color: LAB.robotics.gold },
    { key: "hair", title: "Hair follicle cells", value: bench.dishes.hair, color: LAB.robotics.teal },
    { key: "slow", title: "Slow-dividing cells", value: bench.dishes.slow, color: LAB.chemistry.sage },
  ] as const;
  return (
    <div role="group" aria-label={label} className={cn("grid grid-cols-3 gap-2 px-2 pb-4 pt-16 sm:gap-4 sm:px-4", className)}>
      {groups.map((g) => (
        <MicroscopeView
          key={g.key}
          label={`${g.title} under the microscope, ${Math.round(g.value)}% of the start`}
          surroundClassName="[--surround:var(--color-robo-stage)]"
          caption={
            <span className="flex flex-col">
              <span className="text-[13px] font-semibold text-cream-100 sm:text-[15px]">{g.title}</span>
              <span className="type-readout text-[13px] text-robo-gold">{Math.round(g.value)}%</span>
            </span>
          }
        >
          <MicroscopeCells count={() => cells(g.value)} room={ROOM} color={g.color} faded={() => Math.max(0, 1 - g.value / 100)} ghost={g.key === "hair" && bench.ghostHair !== null ? () => cells(bench.ghostHair ?? 100) : null} slide={g.key === "cancer" ? "#F1EEF3" : "#EEF2EA"} />
        </MicroscopeView>
      ))}
    </div>
  );
}
