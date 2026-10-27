"use client";

import { useState } from "react";
import type { LabId, LevelId } from "@/engine/types";
import { beliefStatus, type BeliefItem, type BeliefStatus } from "@/lib/beliefs";
import { useProgress } from "@/lib/progress";
import { BeliefShiftCard } from "@/components/ui/BeliefShiftCard";
import { SegmentedToggle } from "@/components/ui/Toggle";

/*
 * My beliefs (DESIGN.md §7.6): every belief Ano can spot as a Belief shift
 * card, broken (verify), challenged (apricot) or not yet tested (cream),
 * filtered by lab and level. Each card opens the experiment that tests it.
 */

type LabFilter = "all" | LabId;
type LevelFilter = "all" | LevelId;

const ORDER: Record<BeliefStatus, number> = { broken: 0, challenged: 1, untested: 2 };

export function BeliefGrid({ items }: { items: BeliefItem[] }) {
  const hydrated = useProgress((s) => s.hydrated);
  const broken = useProgress((s) => s.broken);
  const evidence = useProgress((s) => s.evidence);
  const [lab, setLab] = useState<LabFilter>("all");
  const [level, setLevel] = useState<LevelFilter>("all");

  const rows = items
    .filter((b) => (lab === "all" || b.lab === lab) && (level === "all" || b.level === level))
    .map((b) => ({ ...b, ...(hydrated ? beliefStatus(b.id, broken, evidence) : beliefStatus(b.id, {}, {})) }))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const counts = items.map((b) => (hydrated ? beliefStatus(b.id, broken, evidence).status : "untested"));

  return (
    <div className="mt-8 flex flex-col gap-8">
      <p className="text-[15px] text-ink-700" aria-live="polite">
        {counts.filter((c) => c === "broken").length} broken · {counts.filter((c) => c === "challenged").length} challenged · {counts.filter((c) => c === "untested").length} not yet tested
      </p>
      <div className="flex flex-wrap gap-3">
        <SegmentedToggle<LabFilter>
          label="Lab"
          value={lab}
          onChange={setLab}
          options={[
            { value: "all", label: "Both labs" },
            { value: "chemistry", label: "Chemistry" },
            { value: "robotics", label: "Robotics" },
          ]}
        />
        <SegmentedToggle<LevelFilter>
          label="Level"
          value={level}
          onChange={setLevel}
          options={[
            { value: "all", label: "All levels" },
            { value: "easy", label: "Easy" },
            { value: "medium", label: "Medium" },
            { value: "advanced", label: "Advanced" },
          ]}
        />
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((b) => (
          <li key={b.id}>
            <BeliefShiftCard eyebrow={b.where} title={b.title} detail={b.belief} tone={b.tone} statusLabel={b.label} href={b.href} accent={b.lab === "chemistry" ? "chem" : "robo"} className="h-full w-full" />
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="text-ink-500">No beliefs match these filters.</p>}
    </div>
  );
}
