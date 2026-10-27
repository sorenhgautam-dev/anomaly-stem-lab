"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { beliefStatus, type BeliefItem } from "@/lib/beliefs";
import { useProgress } from "@/lib/progress";
import { BeliefShiftCard } from "@/components/ui/BeliefShiftCard";

/*
 * The belief wall (DESIGN.md §7.1): a staggered grid of Belief shift cards
 * for real misconceptions, each opening the experiment built to test it.
 * Status comes from this browser's saved progress once it has loaded, so the
 * first render matches the server (CLAUDE.md §9).
 */

export function BeliefWall({ beliefs }: { beliefs: BeliefItem[] }) {
  const hydrated = useProgress((s) => s.hydrated);
  const broken = useProgress((s) => s.broken);
  const evidence = useProgress((s) => s.evidence);
  useEffect(() => {
    void useProgress.getState().hydrate();
  }, []);

  return (
    <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {beliefs.map((b, i) => {
        const status = hydrated ? beliefStatus(b.id, broken, evidence) : { tone: "untested" as const, label: "Not yet tested" };
        return (
          <li key={b.id} className={cn("reveal", i % 3 === 1 && "lg:translate-y-10")} style={{ ["--reveal-end" as string]: `${65 + (i % 3) * 12}%` }}>
            <BeliefShiftCard eyebrow={b.where} title={b.title} detail={b.belief} tone={status.tone} statusLabel={status.label} href={b.href} accent={b.lab === "chemistry" ? "chem" : "robo"} className="h-full w-full" />
          </li>
        );
      })}
    </ul>
  );
}
