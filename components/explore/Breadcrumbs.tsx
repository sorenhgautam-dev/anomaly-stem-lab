"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, ViewTransition } from "react";
import { getExperiment, isLab, isLevel, labInfo, levelInfo } from "@/lib/content";
import { cn } from "@/lib/cn";

/*
 * The persistent top bar (CLAUDE.md §1.1): Level · Lab · Experiment as
 * clickable breadcrumbs, so students can switch level or lab at any time.
 */

interface Crumb {
  label: string;
  href: string;
}

function crumbsFor(pathname: string): Crumb[] {
  const [section, a, b, c] = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  if (section === "start") {
    crumbs.push({ label: a && isLevel(a) ? levelInfo(a).title : "Choose level", href: "/start" });
    if (a && isLevel(a)) crumbs.push({ label: "Choose lab", href: `/start/${a}` });
  }
  if (section === "beliefs") crumbs.push({ label: "Belief map", href: "/beliefs" });
  if (section === "labs" && a && b && isLab(a) && isLevel(b)) {
    crumbs.push({ label: levelInfo(b).title, href: "/start" });
    crumbs.push({ label: labInfo(a).title.replace(" Lab", ""), href: `/start/${b}` });
    crumbs.push({ label: "Map", href: `/labs/${a}/${b}` });
    const experiment = c ? getExperiment(c) : undefined;
    if (experiment) crumbs.push({ label: experiment.title, href: `/labs/${a}/${b}/${c}` });
  }
  return crumbs;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = crumbsFor(pathname);
  const section = pathname.split("/").filter(Boolean)[0];
  return (
    // Its own transition group, so the lab room (also its own group) never covers it mid-transition.
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center gap-10 bg-[linear-gradient(to_bottom,rgba(5,6,10,0.85),rgba(5,6,10,0))] px-5 pb-8 pt-5 [view-transition-name:crumbs] sm:px-10 sm:pt-7">
      <Link href="/" className="pointer-events-auto text-[17px] font-medium tracking-[0.22em]">
        <ViewTransition name="wordmark">
          <span>ANOMALY</span>
        </ViewTransition>
      </Link>
      <nav aria-label="Where you are" className="pointer-events-auto min-w-0">
        <ol className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1;
            return (
              <Fragment key={crumb.href + crumb.label}>
                {i > 0 && (
                  <li aria-hidden className="text-pearl/30">
                    ·
                  </li>
                )}
                <li>
                  <Link
                    href={crumb.href}
                    aria-current={last ? "page" : undefined}
                    className={cn(
                      "type-label rounded-full px-3 py-2 transition-colors duration-300 ease-lab",
                      last ? "bg-pearl/10 text-pearl" : "text-pearl/55 hover:bg-pearl/10 hover:text-pearl",
                    )}
                  >
                    {crumb.label}
                  </Link>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>
      {section !== "beliefs" && (
        <Link
          href="/beliefs"
          className="type-label pointer-events-auto ml-auto hidden shrink-0 items-center gap-2 rounded-full px-3 py-2 text-pearl/55 transition-colors duration-300 hover:bg-pearl/10 hover:text-pearl sm:inline-flex"
        >
          <span aria-hidden className="size-1.5 rounded-full bg-lilac" />
          Belief map
        </Link>
      )}
    </header>
  );
}
