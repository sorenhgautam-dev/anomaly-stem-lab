"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, ViewTransition, type MouseEvent } from "react";
import { cn } from "@/lib/cn";
import { prefersReducedMotion, useTilt } from "@/lib/motion";
import { resumeAudio, whoosh } from "@/lib/sound";
import { LabObjectView } from "@/components/three/LabObjectView";
import { ScrollCount } from "@/components/ui/ScrollCount";

/*
 * One of the two big lab cards (DESIGN.md §7.1): the lab's own colour world
 * (Chemistry's teal, Robotics' graphite, §8) with a bench of real apparatus
 * from its kit, the real experiment count (also the lab choice on
 * /start/[level]). The whole card is one link; it
 * tilts toward the cursor inside its own hit area.
 *
 * `dive` (lab select): a plain click first flies the camera into the card's
 * 3D object for a beat (LabObjectView reads data-diving), the other card falls
 * back, then the map opens and the card morphs into its frame (DESIGN.md §7.3,
 * §9). Modifier and middle clicks, and reduced motion, navigate at once.
 */

const DIVE_MS = 260;

export function LabCard({ lab, title, line, count, soon = 0, cta, href = "/start", morph, dive = false, scrollScene = false }: { lab: "chemistry" | "robotics"; title: string; line: string; count: number; soon?: number; cta: string; href?: string; morph?: string; dive?: boolean; scrollScene?: boolean }) {
  const host = useRef<HTMLAnchorElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useTilt(host, inner, 5, 1);
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!dive || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || prefersReducedMotion()) return;
    e.preventDefault();
    if (host.current?.hasAttribute("data-diving")) return;
    host.current?.setAttribute("data-diving", "");
    resumeAudio();
    whoosh(0.5);
    window.setTimeout(() => router.push(href), DIVE_MS);
    // If the page is still here later (a cancelled navigation), settle back.
    window.setTimeout(() => host.current?.removeAttribute("data-diving"), 2000);
  };
  return (
    <Link ref={host} href={href} prefetch={morph ? true : undefined} onClick={onClick} data-lab-card className="group block rounded-frame outline-none transition-[opacity,scale] duration-300 ease-out-soft [perspective:1200px] data-diving:scale-[1.02]">
      {/* With `morph`, the card grows into the lab's map frame (DESIGN.md §9). */}
      <ViewTransition name={morph} share="morph" default="none">
        <div
          ref={inner}
          className={cn(
            "relative flex min-h-[30rem] flex-col justify-between overflow-hidden lg:min-h-0 rounded-frame p-6 shadow-warm transition-shadow duration-500 ease-out-soft will-change-transform group-hover:shadow-warm-lg sm:p-8",
            lab === "chemistry" ? "bg-chem-world" : "bg-robo-world",
          )}
        >
          {/* Shorter on lab select (`dive`), so both cards' buttons sit in the first screen. */}
          <LabObjectView lab={lab} scrollScene={scrollScene} className={cn("relative -mx-6 -mt-2 h-64 sm:h-72", dive && "lg:h-56")} />
          <div className="paper-card tilt-layer relative rounded-card p-5 [--depth:0.04]">
            <p className="type-label text-ink-500">
              <ScrollCount value={count} /> experiments{soon > 0 && ` · ${soon} coming soon`}
            </p>
            <h3 className="type-heading mt-1 text-3xl">{title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{line}</p>
            {/* The card is the link; this pill shows where it goes and answers the hover. */}
            <span className="mt-4 inline-flex h-11 items-center rounded-full bg-ink-900 px-5 text-[15px] font-semibold text-cream-50 transition-[background-color,translate] duration-200 ease-out-soft group-hover:-translate-y-0.5 group-hover:bg-ink-700 group-active:translate-y-0">{cta}</span>
          </div>
        </div>
      </ViewTransition>
    </Link>
  );
}
