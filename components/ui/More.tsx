import type { ReactNode } from "react";
import { IconArrowRight } from "@/components/icons/icons";
import { cn } from "@/lib/cn";

/*
 * One small "More" drawer (the owner's subtraction pass): the extras that
 * would crowd a screen wait behind it, so each screen shows its one main
 * action and a few things at most. A native <details>, so it works without
 * JavaScript, from the keyboard and with screen readers.
 */
export function More({ label = "More", children, className, open }: { label?: string; children: ReactNode; className?: string; open?: boolean }) {
  return (
    <details data-more className={cn("group", className)} open={open}>
      <summary className="inline-flex h-11 cursor-pointer list-none items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-ink-700 transition-colors hover:bg-ink-900/[0.05] [&::-webkit-details-marker]:hidden">
        {label}
        <IconArrowRight aria-hidden className="size-3.5 rotate-90 transition-transform duration-200 ease-out-soft group-open:-rotate-90 motion-reduce:transition-none" />
      </summary>
      <div className="mt-3 flex flex-col gap-4">{children}</div>
    </details>
  );
}
