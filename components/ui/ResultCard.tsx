import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ConfidenceChip, StatusDot, type Confidence, type Status } from "./Chip";
import { GlassCard } from "./GlassCard";

/*
 * Result card (DESIGN.md §2 P5, §5): title and confidence chip, then the
 * student's prediction against reality, with a verdict dot.
 */

export interface ResultCardProps {
  title: string;
  /** The student's confidence, when they set one. */
  confidence?: Confidence;
  prediction: string;
  reality: string;
  /** null while the experiment hasn't run. */
  status: Status | null;
  /** Optional action under the rows (e.g. "Try it"). */
  action?: ReactNode;
  float?: boolean;
  phase?: number;
  className?: string;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-ink-900/[0.07] py-2 first:border-t-0">
      <dt className="text-[13px] text-ink-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-ink-900">{children}</dd>
    </div>
  );
}

export function ResultCard({ title, confidence, prediction, reality, status, action, float, phase, className }: ResultCardProps) {
  return (
    <GlassCard float={float} phase={phase} className={cn("w-72 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="type-heading text-base leading-tight">{title}</p>
        {confidence && <ConfidenceChip level={confidence} />}
      </div>
      <dl className="mt-3">
        <Row label="Prediction">{prediction}</Row>
        <Row label="Reality">{status ? <StatusDot status={status} label={reality} /> : reality}</Row>
      </dl>
      {action && <div className="mt-2">{action}</div>}
    </GlassCard>
  );
}
