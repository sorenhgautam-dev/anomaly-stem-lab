"use client";

import { IconPlay } from "@/components/icons/icons";
import { worldOf } from "@/lib/labs";
import { useLab, type Confidence } from "@/lib/store";
import { SegmentedToggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { PredictionChoices } from "@/components/ui/PredictionChoices";
import { Slider } from "@/components/ui/Slider";
import { useLabDef } from "./lab-def";

/*
 * The one thing to predict, then Run (CLAUDE.md §6.1 steps 3–4, DESIGN.md
 * §7.5 bottom centre): large option cards (or a slider), and the black Run
 * pill, which waits for a prediction.
 */

const CONFIDENCE: { value: Confidence; label: string }[] = [
  { value: "guess", label: "Guessing" },
  { value: "fairly", label: "Fairly sure" },
  { value: "certain", label: "Certain" },
];

export function PredictDock({ onRun }: { onRun: () => void }) {
  const def = useLabDef();
  const prediction = useLab((s) => s.prediction);
  const setPrediction = useLab((s) => s.setPrediction);
  const confidence = useLab((s) => s.confidence);
  const setConfidence = useLab((s) => s.setConfidence);
  if (!def) return null;
  const spec = def.prediction;
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:gap-6">
      <div className="min-w-0 flex-1">
        <p id="prediction-question" className="mb-2.5 text-[17px] font-semibold leading-snug">
          {spec.question}
        </p>
        {spec.type === "choice" ? (
          <PredictionChoices question={spec.question} options={spec.options} value={prediction?.type === "choice" ? prediction.value : null} onChange={(value) => setPrediction({ type: "choice", value })} lab={worldOf(def.lab)} />
        ) : (
          <div data-prediction>
            <Slider label="Your guess" value={prediction?.type === "slider" ? prediction.value : (spec.min + spec.max) / 2} min={spec.min} max={spec.max} step={spec.step} unit={spec.unit} tint={worldOf(def.lab) === "chemistry" ? "chem" : "robo"} onChange={(value) => setPrediction({ type: "slider", value })} />
          </div>
        )}
        {/* How sure: one small row under the choices. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-[13px] font-semibold text-ink-700">How sure are you?</span>
          <SegmentedToggle label="How sure are you?" value={confidence} onChange={setConfidence} options={CONFIDENCE} />
        </div>
      </div>
      <Button size="xl" onClick={onRun} disabled={!prediction} icon={<IconPlay aria-hidden className="size-4" />} className="self-start lg:self-end xl:self-auto">
        {prediction ? "Run" : "Run (guess first)"}
      </Button>
    </div>
  );
}
