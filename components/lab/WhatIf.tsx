"use client";

import { IconRestart } from "@/components/icons/icons";
import { cn } from "@/lib/cn";
import { formatReadout } from "@/lib/readout";
import { useLab } from "@/lib/store";
import { usefulWhatIfs, type WhatIf } from "@/lib/what-if";
import { Button } from "@/components/ui/Button";
import { useLabBuild, useLabDef } from "./lab-def";

/*
 * "What if?" (content/what-if.json): one-click variations that change the
 * settings and run at once. WhatIfRow offers the ones that would change the
 * current build; WhatIfResult shows what the simulator gave, beside the run
 * before it, with a way back. Ano's reaction is in his bubble (AnoDock).
 */

export function WhatIfRow({ onRun, className }: { onRun: (variant: WhatIf) => void; className?: string }) {
  const def = useLabDef();
  const build = useLabBuild();
  if (!def || !build) return null;
  const options = usefulWhatIfs(def.id, build);
  if (options.length === 0) return null;
  return (
    <div role="group" aria-labelledby="what-if-title" className={cn("flex flex-wrap items-center gap-2", className)}>
      <h3 id="what-if-title" className="type-heading mr-1 text-base">
        What if?
      </h3>
      <div className="contents">
        {options.map((v) => (
          <Button key={v.id} variant="secondary" onClick={() => onRun(v)} data-what-if={v.id}>
            {v.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function WhatIfResult({ onRun }: { onRun: (variant: WhatIf) => void }) {
  const explore = useLab((s) => s.explore);
  const result = useLab((s) => s.result);
  const build = useLabBuild();
  const setBuild = useLab((s) => s.setBuild);
  if (!explore || !result) return null;
  const { variant, before, from } = explore;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div data-what-if-result className="paper-card flex w-full animate-pop-in flex-col gap-3 rounded-card p-4 motion-reduce:animate-none sm:w-80">
          <p className="type-heading text-lg leading-snug">What if: {variant.label}</p>
          <dl className="flex flex-col gap-2">
            {variant.show.map((r) => {
              const now = result.outcome.readings[r.key];
              const was = before?.[r.key];
              return (
                <div key={r.key} className="flex items-baseline justify-between gap-3 border-t border-ink-900/10 pt-2">
                  <dt className="text-[14px] text-ink-700">{r.label}</dt>
                  <dd className="type-readout text-right text-[15px] text-ink-900">
                    {now === undefined ? "no reading" : formatReadout(now, r)}
                    {was !== undefined && <span className="block text-[12px] text-ink-500">before: {formatReadout(was, r)}</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-[15px] leading-relaxed text-ink-700">This was a test drive, so it doesn&rsquo;t count for or against you. Want to guess first next time?</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => build && setBuild(build)}>Make a guess for this</Button>
            <Button variant="ghost" onClick={() => setBuild(from)}>
              <IconRestart aria-hidden className="size-4" />
              Undo the change
            </Button>
          </div>
        </div>
      </div>
      <WhatIfRow onRun={onRun} />
    </div>
  );
}
