import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * "Your prediction vs the result" (CLAUDE.md §3.7 step 4). Both ticked on a
 * correct run; on a wrong one the prediction gets a cross. Right and wrong
 * differ in icon and words as well as colour.
 */
export function VerdictCard({ predicted, actual, correct, className }: { predicted: string; actual: string; correct: boolean; className?: string }) {
  const row = "flex items-center justify-between gap-6 py-1.5";
  return (
    <dl
      className={cn(
        "glass-hud w-full max-w-xs animate-rise-in rounded-2xl px-4 py-1 text-[14px] [animation-delay:260ms]",
        correct ? "ring-1 ring-resolve-400/35 ring-inset" : "ring-1 ring-anomaly-400/35 ring-inset",
        className,
      )}
    >
      <div className={cn(row, "border-b border-mist-600/25")}>
        <dt className="text-mist-400">You predicted</dt>
        <dd className={cn("flex items-center gap-2 font-medium", correct ? "text-mist-100" : "text-anomaly-300")}>
          {predicted}
          {correct ? <Check aria-hidden className="size-4 text-resolve-400" strokeWidth={2.4} /> : <X aria-hidden className="size-4 text-anomaly-400" strokeWidth={2.4} />}
          <span className="sr-only">{correct ? "(right)" : "(not what happened)"}</span>
        </dd>
      </div>
      <div className={row}>
        <dt className="text-mist-400">The simulator</dt>
        <dd className="flex items-center gap-2 font-medium text-mist-100">
          {actual}
          <Check aria-hidden className={cn("size-4", correct ? "text-resolve-400" : "text-mist-400")} strokeWidth={2.4} />
        </dd>
      </div>
    </dl>
  );
}
