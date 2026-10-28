"use client";

import { useEffect, useRef, useState } from "react";
import { IconPause, IconPlay, IconRestart } from "@/components/icons/icons";
import { IconButton } from "@/components/ui/IconButton";
import { SegmentedToggle } from "@/components/ui/Toggle";
import { playback } from "./playback";

/*
 * The time scrubber (CLAUDE.md §3.5, DESIGN.md §8.1 "Run"): pause, slow
 * motion, rewind and scrub through the run. The thumb moves by writing to
 * the input directly each frame, never through React state.
 */

const SPEEDS = [
  { value: "0.25", label: "¼×" },
  { value: "0.5", label: "½×" },
  { value: "1", label: "1×" },
];

export function TimeScrubber({ timeScale = 1 }: { timeScale?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const clock = useRef<HTMLOutputElement>(null);
  const [playing, setPlaying] = useState(playback.playing);
  const [speed, setSpeed] = useState(String(playback.speed));

  useEffect(() => {
    const offFrame = playback.onFrame((t) => {
      if (input.current) input.current.value = String(t / playback.duration);
      if (clock.current) clock.current.textContent = `${(t * timeScale).toFixed(1)} s`;
    });
    const offState = playback.onState(() => {
      setPlaying(playback.playing);
      setSpeed(String(playback.speed));
    });
    return () => {
      offFrame();
      offState();
    };
  }, [timeScale]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <IconButton label={playing ? "Pause" : "Play"} onClick={() => playback.toggle()}>
        {playing ? <IconPause /> : <IconPlay />}
      </IconButton>
      <IconButton label="Rewind and play again" onClick={() => playback.restart()}>
        <IconRestart />
      </IconButton>
      <label className="flex min-w-48 flex-1 items-center gap-3">
        <span className="sr-only">Time in the run</span>
        <input
          ref={input}
          type="range"
          min={0}
          max={1}
          step={0.001}
          defaultValue={0}
          onChange={(e) => {
            playback.pause();
            playback.seek(Number(e.target.value) * playback.duration);
          }}
          className="h-11 w-full cursor-pointer accent-ink-900"
        />
        <output ref={clock} className="type-readout w-16 text-right text-sm text-ink-700">
          0.0 s
        </output>
      </label>
      <SegmentedToggle label="Playback speed" value={speed} onChange={(v) => playback.setSpeed(Number(v))} options={SPEEDS} />
    </div>
  );
}
