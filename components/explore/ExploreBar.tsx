"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { getExperiment, isLab, isLevel, labInfo, levelInfo } from "@/lib/content";
import { cn } from "@/lib/cn";
import { BreadcrumbBar, type Crumb } from "@/components/ui/BreadcrumbBar";
import { Logo } from "@/components/ui/Logo";

/*
 * The top bar on every explore page (CLAUDE.md §1.1, DESIGN.md §5): the logo,
 * Level · Lab · Experiment as clickable breadcrumbs (switch level or lab at
 * any time) and a link to My beliefs.
 */

export function crumbsFor(pathname: string): Crumb[] {
  const [section, a, b, c] = pathname.split("/").filter(Boolean);
  if (section === "start") {
    if (!a || !isLevel(a)) return [{ label: "Choose level", href: "/start", current: true }];
    return [
      { label: levelInfo(a).title, href: "/start" },
      { label: "Choose lab", href: `/start/${a}`, current: true },
    ];
  }
  if (section === "labs" && a && b && isLab(a) && isLevel(b)) {
    const crumbs: Crumb[] = [
      { label: levelInfo(b).title, href: "/start" },
      { label: labInfo(a).title.replace(" Lab", ""), href: `/labs/${a}/${b}`, current: !c },
    ];
    const experiment = c ? getExperiment(c) : undefined;
    if (experiment) crumbs.push({ label: experiment.title, href: `/labs/${a}/${b}/${c}`, current: true });
    return crumbs;
  }
  // My beliefs has its own button beside the breadcrumbs, so no crumbs there.
  return [];
}

export function ExploreBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const onBeliefs = pathname.startsWith("/beliefs");
  const crumbs = crumbsFor(pathname);
  return (
    <header className={cn("relative z-30 flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6 md:px-8 md:pt-5", className)}>
      <Logo />
      {crumbs.length > 0 && <BreadcrumbBar items={crumbs} className="order-3 w-full justify-center sm:order-none sm:w-auto" />}
      <Link
        href="/beliefs"
        aria-current={onBeliefs ? "page" : undefined}
        className={cn("inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-warm-sm transition-colors", onBeliefs ? "bg-ink-900 text-white" : "bg-white text-ink-900 hover:bg-cream-100")}
      >
        <Lightbulb aria-hidden className="size-4" strokeWidth={1.9} />
        My beliefs
      </Link>
    </header>
  );
}
