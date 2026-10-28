import Link from "next/link";
import { IconBolt } from "@/components/icons/icons";
import { cn } from "@/lib/cn";

/*
 * The logo (DESIGN.md §2 P2): a black circle with a white bolt, and the bold
 * wordmark. The whole lock-up links home.
 */

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="ANOMALY home" className={cn("group inline-flex h-11 items-center gap-2.5 rounded-full pr-3 transition-colors duration-200 hover:bg-ink-900/[0.05]", className)}>
      <span aria-hidden className="grid size-9 place-items-center rounded-full bg-ink-900 text-white transition-transform duration-300 ease-spring group-hover:rotate-12">
        <IconBolt className="size-[18px]" />
      </span>
      <span aria-hidden className="font-display text-xl font-black uppercase tracking-[-0.02em] [font-stretch:80%]">
        Anomaly
      </span>
    </Link>
  );
}
