"use client";

import { Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLab } from "@/lib/store";

/** The one thing to predict, then Run (CLAUDE.md §6.1 steps 3–4). */
export function PredictionPanel({ onRun }: { onRun: () => void }) {
  const def = useLab((s) => s.def);
  const prediction = useLab((s) => s.prediction);
  const setPrediction = useLab((s) => s.setPrediction);
  const phase = useLab((s) => s.phase);
  if (!def) return null;
  const spec = def.prediction;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      <fieldset className="min-w-0">
        <legend className="text-[17px] leading-snug tracking-[-0.01em] text-pearl">{spec.question}</legend>
        {spec.type === "choice" ? (
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Your prediction">
            {spec.options.map((option) => {
              const chosen = prediction?.type === "choice" && prediction.value === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  disabled={phase === "running"}
                  onClick={() => setPrediction({ type: "choice", value: option })}
                  className={cn(
                    "rounded-full px-4 py-2.5 text-[15px] transition-colors duration-200 ease-lab",
                    chosen ? "bg-pearl text-void" : "glass text-pearl hover:bg-pearl/15",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-4">
            <input
              type="range"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              value={prediction?.type === "slider" ? prediction.value : (spec.min + spec.max) / 2}
              onChange={(e) => setPrediction({ type: "slider", value: Number(e.target.value) })}
              aria-label={spec.question}
              className="h-1 w-64 cursor-pointer appearance-none rounded-full bg-pearl/15 accent-lilac"
            />
            <span className="font-mono text-sm text-pearl">
              {prediction?.type === "slider" ? prediction.value : "?"} {spec.unit ?? ""}
            </span>
          </div>
        )}
      </fieldset>
      <button
        type="button"
        onClick={onRun}
        disabled={!prediction || phase === "running"}
        className={cn(
          "group inline-flex shrink-0 items-center gap-3 self-start rounded-full bg-linear-to-r from-ion-600 to-ion-400 px-6 py-3.5 text-[16px] font-medium text-mist-100 transition-[transform,opacity,box-shadow,--tw-gradient-to] duration-300 ease-lab hover:to-glow-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 lg:self-auto",
          prediction && phase !== "running" && "shadow-[0_0_28px_-6px_var(--color-ion-400)]",
        )}
      >
        <Play className="size-4 fill-mist-100 transition-transform duration-300 ease-spring group-hover:scale-125" strokeWidth={0} />
        Run
        {!prediction && <span className="type-label text-mist-100/60">Predict first</span>}
      </button>
    </div>
  );
}
