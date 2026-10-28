import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/cn";

/*
 * Breadcrumb bar (DESIGN.md §5, CLAUDE.md §1.1): a glass pill showing
 * Level · Lab · Experiment, every part clickable so students can switch level
 * or lab at any time.
 */

export interface Crumb {
  label: string;
  href: string;
  current?: boolean;
}

export function BreadcrumbBar({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("paper-card inline-flex max-w-full items-center rounded-[1.4rem] p-1 shadow-warm-sm", className)}>
      <ol className="flex min-w-0 flex-wrap items-center">
        {items.map((item, i) => (
          <Fragment key={item.href}>
            {i > 0 && (
              <li aria-hidden className="px-0.5 text-ink-300">
                ·
              </li>
            )}
            <li className="min-w-0">
              <Link
                href={item.href}
                // Crumbs lead back up the path, so the page wipe plays from the top.
                transitionTypes={item.current ? undefined : ["nav-back"]}
                aria-current={item.current ? "page" : undefined}
                className={cn(
                  "flex min-h-11 min-w-11 items-center justify-center rounded-full px-3.5 py-1 text-center text-sm leading-tight transition-colors duration-200",
                  item.current ? "bg-ink-900 font-semibold text-white" : "font-medium text-ink-700 hover:bg-ink-900/[0.06] hover:text-ink-900",
                )}
              >
                <span>{item.label}</span>
              </Link>
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
