"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, PartyPopper } from "lucide-react";
import type { LabId, LevelId } from "@/engine/types";
import { cn } from "@/lib/cn";
import { fx } from "@/lib/fx";
import { useProgress } from "@/lib/progress";
import { resolveChime } from "@/lib/sound";
import { AnoView } from "@/components/ano/AnoView";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { PathNode, type NodeStatus } from "./PathNode";

/*
 * The experiment map (DESIGN.md §7.4, CLAUDE.md §1.1): nodes on a winding
 * path, unlocked in order (one correct run completes an experiment). Ano
 * peeks over the current node. Finishing every experiment in the level gets a
 * celebration and the next level up. Progress loads after mount, so the
 * first render matches the server (everything shows as not done).
 */

export interface MapStar {
  id: string | null;
  title: string;
  minutes: number | null;
  order: number;
}

function statusesFor(stars: MapStar[], done: Record<string, true>): NodeStatus[] {
  let currentGiven = false;
  return stars.map((star, i) => {
    if (!star.id) return "soon";
    if (done[star.id]) return "done";
    const unlocked = stars.slice(0, i).every((s) => !s.id || done[s.id]);
    if (!unlocked) return "locked";
    if (currentGiven) return "open";
    currentGiven = true;
    return "current";
  });
}

/** A smooth curve through the node centres (measured, so it always meets them). */
function usePathThrough(list: React.RefObject<HTMLOListElement | null>, count: number) {
  const [d, setD] = useState<{ path: string; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const pts = [...el.querySelectorAll<HTMLElement>("[data-node-anchor]")].map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
      });
      let path = pts.length ? `M ${pts[0].x} ${pts[0].y}` : "";
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const dy = (b.y - a.y) / 2;
        path += ` C ${a.x} ${a.y + dy}, ${b.x} ${b.y - dy}, ${b.x} ${b.y}`;
      }
      setD({ path, w: box.width, h: box.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [list, count]);
  return d;
}

export function ExperimentPath({ lab, level, stars, nextLevel }: { lab: LabId; level: LevelId; stars: MapStar[]; nextLevel: { id: LevelId; title: string } | null }) {
  const hydrated = useProgress((s) => s.hydrated);
  const done = useProgress((s) => s.done);
  const list = useRef<HTMLOListElement>(null);
  const curve = usePathThrough(list, stars.length);
  const statuses = statusesFor(stars, hydrated ? done : {});
  const playable = stars.filter((s) => s.id);
  const doneCount = playable.filter((s) => hydrated && done[s.id!]).length;
  const complete = hydrated && playable.length > 0 && doneCount === playable.length;
  const tint = lab === "chemistry" ? "chem" : "robo";

  // Celebrate a finished level once per visit (confetti in brand colours).
  const celebrated = useRef(false);
  useEffect(() => {
    if (!complete || celebrated.current) return;
    celebrated.current = true;
    fx.confetti();
    resolveChime();
  }, [complete]);

  return (
    <div className="mt-10 flex flex-col gap-8">
      <p className="text-sm font-semibold text-ink-700" aria-live="polite">
        {hydrated ? `${doneCount} of ${playable.length} done` : " "}
      </p>
      {complete && (
        <GlassCard className="flex animate-pop-in flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between motion-reduce:animate-none">
          <span className="flex items-center gap-3">
            <PartyPopper aria-hidden className="size-6 text-apricot-600" />
            <span className="type-heading text-2xl">Level complete! Ready for the next one?</span>
          </span>
          {nextLevel && (
            <Button href={`/labs/${lab}/${nextLevel.id}`} icon={<ArrowRight className="size-4" />}>
              On to {nextLevel.title}
            </Button>
          )}
        </GlassCard>
      )}
      <div className="relative">
        {curve && (
          <svg aria-hidden className="pointer-events-none absolute inset-0 hidden md:block" width={curve.w} height={curve.h}>
            <defs>
              <linearGradient id={`path-${tint}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={tint === "chem" ? "var(--color-apricot-400)" : "var(--color-volt-400)"} />
                <stop offset="1" stopColor={tint === "chem" ? "var(--color-flame-500)" : "var(--color-grape-500)"} />
              </linearGradient>
            </defs>
            <path d={curve.path} fill="none" stroke="var(--color-white)" strokeWidth="14" strokeLinecap="round" opacity="0.7" />
            <path d={curve.path} fill="none" stroke={`url(#path-${tint})`} strokeWidth="4" strokeLinecap="round" strokeDasharray="2 12" />
          </svg>
        )}
        <ol ref={list} className="relative flex flex-col gap-8 md:gap-6">
          {stars.map((star, i) => (
            <li key={star.id ?? `soon-${i}`} className={cn("reveal md:w-[46%]", i % 2 ? "md:self-end" : "md:self-start")}>
              <span data-node-anchor className="block">
                <PathNode
                  index={i}
                  title={star.title}
                  minutes={star.minutes}
                  status={statuses[i]}
                  href={star.id ? `/labs/${lab}/${level}/${star.id}` : null}
                  morph={star.id ? `exp-${star.id}` : undefined}
                  peek={statuses[i] === "current" ? <AnoView className="absolute bottom-full right-6 h-28 w-40" framing="peek" pose="peek" expression="curious" label="Ano, by the next experiment" /> : undefined}
                />
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
