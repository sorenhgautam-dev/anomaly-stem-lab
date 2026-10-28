"use client";

import { useState } from "react";
import type { LabId, LevelId } from "@/engine/types";
import { cn } from "@/lib/cn";
import { beliefStatus, type BeliefItem, type BeliefStatus } from "@/lib/beliefs";
import { useProgress } from "@/lib/progress";
import { BeliefRow } from "./BeliefRow";
import { Button } from "@/components/ui/Button";
import { SegmentedToggle } from "@/components/ui/Toggle";

/*
 * My beliefs (DESIGN.md §7.6) as a belief register: every belief Ano can
 * spot, on lab notebook pages grouped by status (broken, challenged, not yet
 * tested). Each ruled row (BeliefRow) carries the level's element tile, the
 * lab's mark, the belief in the student's words and a status stamp, and opens
 * the experiment that tests it. Sorted by lab, then level, inside each group.
 * Filter by lab and level; the rows come in again after each change. Status
 * comes from this browser's saved progress once it has loaded (CLAUDE.md §9).
 */

type LabFilter = "all" | LabId;
type LevelFilter = "all" | LevelId;

const GROUPS: { status: BeliefStatus; title: string; note: string; dot: string }[] = [
  { status: "broken", title: "Busted", note: "You saw these were wrong, then got it right.", dot: "bg-verify-500" },
  { status: "challenged", title: "Still testing", note: "Your guesses matched these ideas. Test them again.", dot: "bg-chem-wall" },
  { status: "untested", title: "Not tested yet", note: "Run the experiment next to each one to find out.", dot: "bg-cream-300 ring-1 ring-ink-300" },
];

/** Inside a group: Chemistry before Robotics, then Easy, Medium, Advanced, then by title. */
const LEVEL_ORDER: Record<LevelId, number> = { easy: 0, medium: 1, advanced: 2 };
const byLabThenLevel = (a: BeliefItem, b: BeliefItem) => a.lab.localeCompare(b.lab) || LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.title.localeCompare(b.title);

export function BeliefList({ items }: { items: BeliefItem[] }) {
  const hydrated = useProgress((s) => s.hydrated);
  const broken = useProgress((s) => s.broken);
  const evidence = useProgress((s) => s.evidence);
  const [lab, setLab] = useState<LabFilter>("all");
  const [level, setLevel] = useState<LevelFilter>("all");

  const status = (b: BeliefItem) => (hydrated ? beliefStatus(b.id, broken, evidence) : beliefStatus(b.id, {}, {}));
  const all = [...items].sort(byLabThenLevel).map((b) => ({ b, s: status(b) }));
  const rows = all.filter(({ b }) => (lab === "all" || b.lab === lab) && (level === "all" || b.level === level));

  return (
    <div className="mx-auto mt-8 flex w-full max-w-3xl flex-col gap-8">
      <p className="text-[15px] text-ink-700" aria-live="polite">
        {GROUPS.map((g) => `${all.filter((r) => r.s.status === g.status).length} ${g.title.toLowerCase()}`).join(" · ")}
      </p>
      <div className="flex flex-wrap gap-3">
        <SegmentedToggle<LabFilter>
          label="Lab"
          value={lab}
          onChange={setLab}
          options={[
            { value: "all", label: "Both" },
            { value: "chemistry", label: "Chemistry" },
            { value: "robotics", label: "Robotics" },
          ]}
        />
        <SegmentedToggle<LevelFilter>
          label="Level"
          value={level}
          onChange={setLevel}
          options={[
            { value: "all", label: "All" },
            { value: "easy", label: "Easy" },
            { value: "medium", label: "Medium" },
            { value: "advanced", label: "Advanced" },
          ]}
        />
      </div>
      {/* Re-keyed per filter, so the matching rows spring in again (no page-wide transition). */}
      <div key={`${lab}-${level}`} className="flex flex-col gap-10">
        {GROUPS.map((g) => {
          const group = rows.filter((r) => r.s.status === g.status);
          if (group.length === 0) return null;
          return (
            <section key={g.status} aria-labelledby={`group-${g.status}`} className="flex flex-col gap-3">
              <div className="flex items-baseline gap-3">
                <span aria-hidden className={cn("size-2.5 shrink-0 translate-y-[-0.1em] rounded-full", g.dot)} />
                <h2 id={`group-${g.status}`} className="type-heading text-2xl">
                  {g.title} <span className="type-readout text-base text-ink-500">{group.length}</span>
                </h2>
              </div>
              <p className="-mt-1 text-[15px] text-ink-500">{g.note}</p>
              {/* One notebook page per group, ruled between the rows. */}
              <ul className="paper-card animate-card-in overflow-hidden rounded-card [transform-origin:50%_0%] motion-reduce:animate-none">
                {group.map(({ b, s }, i) => (
                  <li key={b.id} className="border-b border-ink-900/10 last:border-b-0">
                    <BeliefRow item={b} status={s.status} index={i} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {rows.length === 0 && (
          // An empty notebook page, and the way back to every belief.
          <div className="paper-card flex flex-col items-start gap-4 rounded-card p-6 sm:p-8">
            <span aria-hidden className="flex w-full flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-px w-full bg-ink-900/10" />
              ))}
            </span>
            <p className="type-heading text-xl">No ideas here yet.</p>
            <p className="-mt-2 text-[15px] text-ink-500">Nothing matches this lab and level together. Try another pair, or see them all.</p>
            <Button
              variant="secondary"
              onClick={() => {
                setLab("all");
                setLevel("all");
              }}
            >
              Show all ideas
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
