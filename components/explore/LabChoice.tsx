"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { LabId, LevelId } from "@/engine/types";
import { cn } from "@/lib/cn";
import { softClick, unlockAudio } from "@/lib/sound";
import type { LabChoiceState } from "./LabChoiceScene";

const LabChoiceScene = dynamic(() => import("./LabChoiceScene"), { ssr: false });

export interface LabOption {
  id: LabId;
  title: string;
  line: string;
  count: number;
}

/**
 * Choose your lab. The 3D objects are decoration you can play with; the
 * real controls are the two buttons laid over them (keyboard and screen
 * readers get the same choice).
 */
export function LabChoice({ level, options }: { level: LevelId; options: LabOption[] }) {
  const router = useRouter();
  const state = useRef<LabChoiceState>({ hovered: null, chosen: null });
  const [chosen, setChosen] = useState<LabId | null>(null);

  const choose = (lab: LabId) => {
    if (state.current.chosen) return;
    unlockAudio();
    softClick();
    state.current.chosen = lab;
    setChosen(lab);
    router.prefetch(`/labs/${lab}/${level}`);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(`/labs/${lab}/${level}`);
    }
  };

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="absolute inset-0">
        <LabChoiceScene
          state={state}
          onArrive={() => {
            const lab = state.current.chosen;
            if (lab) router.push(`/labs/${lab}/${level}`);
          }}
        />
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-20 bg-void transition-opacity duration-700 ease-lab",
          chosen ? "opacity-100 delay-300" : "opacity-0",
        )}
      />
      <div className="relative z-10 grid flex-1 grid-cols-1 sm:grid-cols-2">
        {options.map((lab) => (
          <button
            key={lab.id}
            type="button"
            onClick={() => choose(lab.id)}
            onPointerEnter={() => (state.current.hovered = lab.id)}
            onPointerLeave={() => (state.current.hovered = null)}
            onFocus={() => (state.current.hovered = lab.id)}
            onBlur={() => (state.current.hovered = null)}
            className="group flex min-h-[40vh] flex-col justify-end px-5 pb-16 text-left sm:px-10 sm:pb-20"
          >
            <span className="type-headline block text-[clamp(2.5rem,5vw,4.5rem)]">
              {lab.title.replace(" Lab", "")}
              <span className="type-accent text-lilac"> lab</span>
            </span>
            <span className="mt-3 block max-w-sm text-[17px] leading-[1.45] text-pearl/70">{lab.line}</span>
            <span className="type-label mt-6 inline-flex w-fit items-center gap-2.5 rounded-full bg-pearl px-4 py-3 text-void transition-transform duration-300 ease-lab group-hover:scale-105 group-focus-visible:scale-105">
              <span aria-hidden className="size-1.5 rounded-full bg-signal" />
              {lab.count} experiments
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
