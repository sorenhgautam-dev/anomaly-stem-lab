"use client";

import { cn } from "@/lib/cn";
import { useLab, type Confidence } from "@/lib/store";

/*
 * The thin glass strip at the top of the lab (CLAUDE.md §3.5): the mission
 * goal, the current step, and how sure the student is about the prediction.
 */

const STEPS = ["Build", "Predict", "Run", "Result"] as const;

const CONFIDENCE: { id: Confidence; label: string }[] = [
  { id: "guess", label: "Guessing" },
  { id: "fairly", label: "Fairly sure" },
  { id: "certain", label: "Certain" },
];

export function MissionBar() {
  const def = useLab((s) => s.def);
  const phase = useLab((s) => s.phase);
  const prediction = useLab((s) => s.prediction);
  const confidence = useLab((s) => s.confidence);
  const setConfidence = useLab((s) => s.setConfidence);
  if (!def) return null;

  const step = phase === "result" ? 3 : phase === "running" ? 2 : prediction ? 1 : 0;

  return (
    <div className="glass flex flex-col gap-3 rounded-[18px] px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      <p className="min-w-0 text-[15px] leading-snug tracking-[-0.01em] text-pearl">
        <span className="type-label mr-3 text-pearl/45">Mission</span>
        {def.goal}
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <ol className="flex items-center gap-1.5" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "type-label flex items-center gap-1.5 rounded-full px-2.5 py-1.5",
                i === step ? "bg-pearl/12 text-pearl" : i < step ? "text-pearl/60" : "text-pearl/30",
              )}
            >
              <span className={cn("size-1.5 rounded-full", i === step ? "bg-signal" : i < step ? "bg-pearl/60" : "bg-pearl/20")} />
              {s}
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-2" role="radiogroup" aria-label="How sure are you?">
          <span className="type-label text-pearl/45">How sure?</span>
          {CONFIDENCE.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={confidence === c.id}
              onClick={() => setConfidence(c.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] transition-colors duration-200 ease-lab",
                confidence === c.id ? "bg-pearl text-void" : "text-pearl/60 hover:bg-pearl/10 hover:text-pearl",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
