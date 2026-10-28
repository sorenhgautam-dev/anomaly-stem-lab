import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Info chip card, e.g. "How it works" (DESIGN.md §2 P6, §5): a paper card with
 * a 36 px icon tile (its lab's colour, Chemistry teal or Robotics graphite, at
 * 20%), a title and a subtitle.
 * When it has an href the whole card is the link.
 */

export function InfoChipCard({
  icon,
  title,
  subtitle,
  href,
  tint = "chem",
  className,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  href?: string;
  tint?: "chem" | "robo";
  className?: string;
}) {
  const body = (
    <>
      <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-tile text-ink-900 [&_svg]:size-[18px]">
        <span aria-hidden className={cn("absolute inset-0 opacity-20", tint === "chem" ? "bg-chem-wall" : "bg-robo-wall")} />
        <span className="relative">{icon}</span>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink-900">{title}</span>
        <span className="block text-[13px] leading-snug text-ink-500">{subtitle}</span>
      </span>
    </>
  );
  const classes = cn(
    "paper-card inline-flex min-h-11 items-center gap-3 rounded-card py-3 pl-3 pr-5 text-left",
    href && "transition-[transform,box-shadow] duration-300 ease-out-soft hover:shadow-warm-lg",
    className,
  );
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
