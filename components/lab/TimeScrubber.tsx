"use client";

import { useEffect, useReducer, useRef } from "react";
import { FastForward, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { playback } from "./playback";

/*
 * Time scrubber (CLAUDE.md §3.5): pause, slow motion, rewind and scrub
 * through a run. The slider and clock are written from the playback loop
 * directly; React only re-renders when play / pause / speed change.
 */

function formatTime(t: number, scale: number): string {
  const seconds = t * scale;
  return seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}` : `${seconds.toFixed(1)} s`;
}

export function TimeScrubber({ timeScale = 1 }: { timeScale?: number }) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const range = useRef<HTMLInputElement>(null);
  const clock = useRef<HTMLSpanElement>(null);

  useEffect(() => playback.onState(rerender), []);
  useEffect(
    () =>
      playback.onFrame((t) => {
        if (range.current) range.current.value = String(t / playback.duration);
        if (clock.current) clock.current.textContent = formatTime(t, timeScale);
      }),
    [timeScale],
  );

  const button =
    "grid size-10 place-items-center rounded-full text-pearl/80 transition-colors duration-200 ease-lab hover:bg-pearl/10 hover:text-pearl";
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Playback">
      <button type="button" className={button} onClick={() => playback.restart()} aria-label="Rewind and replay">
        <RotateCcw className="size-4" strokeWidth={1.8} />
      </button>
      <button
        type="button"
        className={button}
        onClick={() => playback.toggle()}
        aria-label={playback.playing ? "Pause" : "Play"}
      >
        {playback.playing ? <Pause className="size-4" strokeWidth={1.8} /> : <Play className="size-4" strokeWidth={1.8} />}
      </button>
      <button
        type="button"
        className={cn(button, "w-auto px-3 font-mono text-xs", playback.speed < 1 && "bg-pearl/10 text-pearl")}
        onClick={() => playback.setSpeed(playback.speed < 1 ? 1 : 0.25)}
        aria-label={playback.speed < 1 ? "Normal speed" : "Slow motion"}
        aria-pressed={playback.speed < 1}
      >
        {playback.speed < 1 ? "¼×" : "1×"}
      </button>
      <input
        ref={range}
        type="range"
        min={0}
        max={1}
        step={0.001}
        defaultValue={0}
        aria-label="Scrub through the run"
        onInput={(e) => {
          playback.pause();
          playback.seek(Number(e.currentTarget.value) * playback.duration);
        }}
        className="mx-2 h-1 min-w-24 flex-1 cursor-pointer appearance-none rounded-full bg-pearl/15 accent-lilac"
      />
      <span ref={clock} className="w-16 text-right font-mono text-xs tabular-nums text-pearl/70">
        0.0 s
      </span>
      <button type="button" className={button} onClick={() => playback.skip()} aria-label="Skip to the end">
        <FastForward className="size-4" strokeWidth={1.8} />
      </button>
    </div>
  );
}
