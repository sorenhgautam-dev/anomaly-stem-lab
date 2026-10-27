"use client";

import Link from "next/link";
import { useRef, ViewTransition } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTilt } from "@/lib/motion";
import { LabObjectView } from "@/components/three/LabObjectView";

/*
 * One of the two big lab cards (DESIGN.md §7.1): Chem or Robo gradient, a
 * small 3D object, the real experiment count (also the lab choice on
 * /start/[level]). The whole card is one link; it
 * tilts toward the cursor inside its own hit area.
 */

export function LabCard({ lab, title, line, count, cta, href = "/start", morph }: { lab: "chemistry" | "robotics"; title: string; line: string; count: number; cta: string; href?: string; morph?: string }) {
  const host = useRef<HTMLAnchorElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useTilt(host, inner, 5);
  return (
    <Link ref={host} href={href} prefetch={morph ? true : undefined} data-lab-card className="group block rounded-frame outline-none [perspective:1200px]">
      {/* With `morph`, the card grows into the lab's map frame (DESIGN.md §9). */}
      <ViewTransition name={morph} share="morph" default="none">
        <div
          ref={inner}
          className={cn(
            "relative flex min-h-[30rem] flex-col justify-between overflow-hidden rounded-frame p-6 shadow-warm transition-[transform,box-shadow] duration-500 ease-out-soft group-hover:shadow-warm-lg sm:p-8",
            lab === "chemistry" ? "bg-chem" : "bg-robo",
          )}
        >
          <span aria-hidden className="absolute inset-0 bg-[radial-gradient(80%_60%_at_70%_20%,rgb(255_255_255/0.45),transparent_70%)]" />
          <LabObjectView kind={lab === "chemistry" ? "flask" : "robot"} className="relative -mx-6 -mt-2 h-64 sm:h-72" />
          <div className="glass-card relative rounded-card p-5">
            <p className="type-eyebrow text-ink-500">{count} experiments</p>
            <h3 className="type-heading mt-1 text-3xl">{title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{line}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
              {cta}
              <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </ViewTransition>
    </Link>
  );
}
