"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconFlag } from "@/components/icons/icons";
import type { LabId, LevelId } from "@/engine/types";
import { cn } from "@/lib/cn";
import { fx } from "@/lib/fx";
import { useProgress } from "@/lib/progress";
import { resolveChime } from "@/lib/sound";
import { Button } from "@/components/ui/Button";
import { PaperCard } from "@/components/ui/PaperCard";
import { PathNode, type NodeStatus } from "./PathNode";

/** Each lab's path is drawn in its own colour world's hue (DESIGN.md §8): Chemistry's teal, Robotics' graphite. */
/** The path's dashes, in each lab's light colours (the maps sit on the lab's dark world). */
const HUE = { chem: ["chem-gold", "chem-sage"], robo: ["robo-gold", "robo-teal"] } as const;

/*
 * The experiment map (DESIGN.md §7.4, CLAUDE.md §1.1): nodes on a winding
 * path, opened in order (one correct run completes an experiment). The
 * nodes spring in one after another and the path draws itself between them
 * (Ano stands in the page's headline). Finishing every experiment in the level gets a
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
    const reachable = stars.slice(0, i).every((s) => !s.id || done[s.id]);
    if (!reachable) return "locked";
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

  // Celebrate a finished level once per visit (two-colour confetti).
  const celebrated = useRef(false);
  useEffect(() => {
    if (!complete || celebrated.current) return;
    celebrated.current = true;
    fx.confetti();
    resolveChime();
  }, [complete]);

  return (
    <div className="mt-10 flex flex-col gap-8">
      <p className="text-sm font-semibold text-cream-200" aria-live="polite">
        {hydrated ? `${doneCount} of ${playable.length} done` : " "}
      </p>
      {complete && (
        <PaperCard className="flex animate-pop-in flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between motion-reduce:animate-none">
          <span className="flex items-center gap-3">
            <IconFlag aria-hidden className="size-6 text-verify-700" />
            <span className="type-heading text-2xl">Level complete! Ready for the next one?</span>
          </span>
          {nextLevel && (
            <Button href={`/labs/${lab}/${nextLevel.id}`}>
              On to {nextLevel.title}
            </Button>
          )}
        </PaperCard>
      )}
      <div className="relative">
        {curve && (
          <svg aria-hidden className="pointer-events-none absolute inset-0 hidden md:block" width={curve.w} height={curve.h}>
            <defs>
              {/* The path draws itself from the first node down (DESIGN.md §9.1). */}
              <mask id={`path-draw-${tint}`}>
                <path d={curve.path} fill="none" stroke="white" strokeWidth="18" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" className="animate-draw-path motion-reduce:animate-none" />
              </mask>
              <linearGradient id={`path-${tint}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={`var(--color-${HUE[tint][0]})`} />
                <stop offset="1" stopColor={`var(--color-${HUE[tint][1]})`} />
              </linearGradient>
            </defs>
            <g mask={`url(#path-draw-${tint})`}>
              <path d={curve.path} fill="none" stroke="var(--color-white)" strokeWidth="14" strokeLinecap="round" opacity="0.08" />
              <path d={curve.path} fill="none" stroke={`url(#path-${tint})`} strokeWidth="4" strokeLinecap="round" strokeDasharray="2 12" />
            </g>
          </svg>
        )}
        <ol ref={list} className="relative flex flex-col gap-8 md:gap-6">
          {stars.map((star, i) => (
            <li key={star.id ?? `soon-${i}`} className={cn("animate-card-in [transform-origin:50%_0%] motion-reduce:animate-none md:w-[46%]", i % 2 ? "md:self-end" : "md:self-start")} style={{ animationDelay: `${160 + Math.min(i, 7) * 90}ms` }}>
              <span data-node-anchor className="block">
                <PathNode
                  index={i}
                  id={star.id}
                  lab={lab}
                  title={star.title}
                  minutes={star.minutes}
                  status={statuses[i]}
                  href={star.id ? `/labs/${lab}/${level}/${star.id}` : null}
                  morph={star.id ? `exp-${star.id}` : undefined}
                />
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
