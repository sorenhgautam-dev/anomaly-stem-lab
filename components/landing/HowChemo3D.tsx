"use client";

import { cn } from "@/lib/cn";
import { LAB } from "@/lib/tokens";
import { MicroscopeMix, MicroscopeView } from "@/components/lab3d/kit/bio/Microscope";
import type { HowBench } from "./how-sequence";

/*
 * How it works' microscope (DESIGN.md §7.1 item 2): the real chemo
 * experiment's three kinds of cells mixed in one dark field, each at the
 * engine's value for the step: cancer cells gold, hair follicle cells teal,
 * slow-dividing cells sage. Cells shrink away and refill between steps, so
 * scrolling plays the experiment. The guess's idea for the hair cells shows
 * on their bar under the field (HowItWorks), so the field stays clear.
 */

const ROOM = 30;
const cells = (pct: number) => (pct / 100) * ROOM;

export function HowChemo3D({ bench, label, className }: { bench: HowBench; label: string; className?: string }) {
  const d = bench.dishes;
  const hit = (pct: number) => () => Math.max(0, 1 - pct / 100);
  return (
    <MicroscopeView label={label} rim="metal" className={cn("w-full", className)} surroundClassName="[--surround:var(--color-robo-stage)]">
      <MicroscopeMix
        room={ROOM}
        groups={[
          { key: "cancer", color: LAB.robotics.gold, count: () => cells(d.cancer), faded: hit(d.cancer) },
          { key: "hair", color: LAB.robotics.teal, count: () => cells(d.hair), faded: hit(d.hair) },
          { key: "slow", color: LAB.chemistry.sage, count: () => cells(d.slow), faded: hit(d.slow) },
        ]}
      />
    </MicroscopeView>
  );
}
