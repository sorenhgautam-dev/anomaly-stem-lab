"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import anoLines from "@/content/ano-lines.json";
import type { LabId, LevelId } from "@/engine/types";
import { cn } from "@/lib/cn";
import { useProgress } from "@/lib/progress";
import { AnoLine } from "./AnoLine";

/*
 * The experiment map (CLAUDE.md §1.1): every experiment for a lab and level
 * as a glowing path of stars. Done = gold, current = pulsing, locked = dim.
 * Experiments unlock in order; planned ones show as "coming soon" stars.
 */

export interface MapStar {
  id: string | null;
  title: string;
  minutes: number | null;
  order: number;
}

type Status = "done" | "current" | "open" | "locked" | "soon";

export function ExperimentMap({
  lab,
  level,
  stars,
  nextLevel,
}: {
  lab: LabId;
  level: LevelId;
  stars: MapStar[];
  nextLevel: { id: LevelId; title: string } | null;
}) {
  const hydrated = useProgress((s) => s.hydrated);
  const done = useProgress((s) => s.done);
  const playable = stars.filter((s): s is MapStar & { id: string } => s.id !== null);
  const siblings = playable.map((s) => ({ order: s.order, id: s.id }));

  const statuses: Status[] = stars.map((star) => {
    if (!star.id) return "soon";
    if (!hydrated) return star.order === 1 ? "current" : "locked";
    if (done[star.id]) return "done";
    const unlocked = siblings.filter((s) => s.order < star.order).every((s) => done[s.id]);
    if (!unlocked) return "locked";
    return "current";
  });
  // Only the first unlocked, unfinished star pulses; others are just open.
  const firstCurrent = statuses.indexOf("current");
  const finalStatuses = statuses.map((s, i) => (s === "current" && i !== firstCurrent ? "open" : s));
  const doneCount = playable.filter((s) => done[s.id]).length;
  const levelComplete = hydrated && playable.length > 0 && doneCount === playable.length;

  // Points along a gentle wave, in percent of the map box.
  const n = stars.length;
  const points = stars.map((_, i) => ({
    x: n === 1 ? 50 : 8 + (84 * i) / (n - 1),
    y: 50 + (i % 2 === 0 ? -16 : 16) * (n > 1 ? 1 : 0),
  }));
  const path = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const mid = (prev.x + p.x) / 2;
      return `C ${mid} ${prev.y}, ${mid} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(" ");
  const litUntil = finalStatuses.lastIndexOf("done");

  return (
    <div className="flex flex-1 flex-col">
      <p className="type-label mt-8 text-pearl/55" aria-live="polite">
        {hydrated ? `${doneCount} of ${playable.length} done` : " "}
      </p>

      {/* Desktop: a horizontal constellation. */}
      <div className="relative mt-6 hidden h-[52vh] min-h-[22rem] sm:block">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="lit" x1="0" x2="1">
              <stop offset="0%" stopColor="#F2C14E" />
              <stop offset="100%" stopColor="#B8A6FF" />
            </linearGradient>
          </defs>
          <path d={path} fill="none" stroke="rgba(237,235,255,0.14)" strokeWidth="0.25" strokeDasharray="0.6 0.9" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.5 }} />
          {litUntil > 0 && (
            <path
              d={points
                .slice(0, litUntil + 1)
                .map((p, i, arr) => {
                  if (i === 0) return `M ${p.x} ${p.y}`;
                  const prev = arr[i - 1];
                  const mid = (prev.x + p.x) / 2;
                  return `C ${mid} ${prev.y}, ${mid} ${p.y}, ${p.x} ${p.y}`;
                })
                .join(" ")}
              fill="none"
              stroke="url(#lit)"
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 2, filter: "drop-shadow(0 0 6px rgba(242,193,78,0.6))" }}
            />
          )}
        </svg>
        {stars.map((star, i) => (
          <Star key={star.id ?? star.title} star={star} status={finalStatuses[i]} lab={lab} level={level} style={{ left: `${points[i].x}%`, top: `${points[i].y}%` }} below={i % 2 === 0} />
        ))}
      </div>

      {/* Phones: the same stars as a vertical path. */}
      <ol className="mt-8 flex flex-col gap-2 sm:hidden">
        {stars.map((star, i) => (
          <li key={star.id ?? star.title}>
            <StarRow star={star} status={finalStatuses[i]} lab={lab} level={level} />
          </li>
        ))}
      </ol>

      {levelComplete && (
        <div className="glass mt-10 flex flex-col gap-5 rounded-[22px] p-6 sm:flex-row sm:items-center sm:justify-between">
          <AnoLine text={anoLines.levelUp[0]} />
          {nextLevel && (
            <Link
              href={`/labs/${lab}/${nextLevel.id}`}
              className="type-label inline-flex w-fit items-center gap-2.5 rounded-full bg-resolve px-4 py-3 text-void"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-void" />
              Next level: {nextLevel.title}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

const DOT: Record<Status, string> = {
  done: "bg-resolve shadow-[0_0_24px_6px_rgba(242,193,78,0.55)]",
  current: "bg-lilac shadow-[0_0_28px_8px_rgba(184,166,255,0.65)] animate-[star-pulse_1.8s_ease-in-out_infinite]",
  open: "bg-lilac/80 shadow-[0_0_16px_3px_rgba(184,166,255,0.4)]",
  locked: "bg-pearl/25",
  soon: "border border-dashed border-pearl/30 bg-transparent",
};

const STATUS_LABEL: Record<Status, string> = {
  done: "Done",
  current: "Up next",
  open: "Open",
  locked: "Locked",
  soon: "Coming soon",
};

function Star({
  star,
  status,
  lab,
  level,
  style,
  below,
}: {
  star: MapStar;
  status: Status;
  lab: LabId;
  level: LevelId;
  style: React.CSSProperties;
  below: boolean;
}) {
  const playable = star.id && status !== "locked" && status !== "soon";
  const label = (
    <span
      className={cn(
        "absolute left-1/2 w-52 -translate-x-1/2 text-center",
        below ? "top-full mt-5" : "bottom-full mb-5",
      )}
    >
      <span className={cn("block text-[17px] leading-tight tracking-[-0.01em]", status === "locked" || status === "soon" ? "text-pearl/45" : "text-pearl")}>
        {star.title}
      </span>
      <span className="type-label mt-2 block text-pearl/45">
        {STATUS_LABEL[status]}
        {star.minutes ? ` · ${star.minutes} min` : ""}
      </span>
    </span>
  );
  const dot = (
    <span className={cn("relative grid size-5 place-items-center rounded-full transition-transform duration-300 ease-lab", DOT[status])}>
      {status === "locked" && <Lock className="size-2.5 text-void" aria-hidden />}
    </span>
  );
  const className = "absolute -translate-x-1/2 -translate-y-1/2";
  if (playable && star.id) {
    return (
      <Link
        href={`/labs/${lab}/${level}/${star.id}`}
        style={style}
        className={cn(className, "group rounded-full p-3 hover:[&>span:first-child]:scale-125")}
        aria-label={`${star.title}, ${STATUS_LABEL[status]}`}
      >
        {dot}
        {label}
      </Link>
    );
  }
  return (
    <span style={style} className={cn(className, "p-3")} aria-label={`${star.title}, ${STATUS_LABEL[status]}`}>
      {dot}
      {label}
    </span>
  );
}

function StarRow({ star, status, lab, level }: { star: MapStar; status: Status; lab: LabId; level: LevelId }) {
  const playable = star.id && status !== "locked" && status !== "soon";
  const inner = (
    <span className="flex items-center gap-4 rounded-2xl px-3 py-4">
      <span className={cn("size-4 shrink-0 rounded-full", DOT[status])} />
      <span className="flex flex-col">
        <span className={cn("text-[17px]", status === "locked" || status === "soon" ? "text-pearl/45" : "text-pearl")}>{star.title}</span>
        <span className="type-label mt-1.5 text-pearl/45">
          {STATUS_LABEL[status]}
          {star.minutes ? ` · ${star.minutes} min` : ""}
        </span>
      </span>
    </span>
  );
  if (playable && star.id) {
    return (
      <Link href={`/labs/${lab}/${level}/${star.id}`} className="block rounded-2xl hover:bg-pearl/5">
        {inner}
      </Link>
    );
  }
  return inner;
}
