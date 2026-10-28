"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useTilt } from "@/lib/motion";

/*
 * Wraps a card so it tilts toward the cursor, lifts and presses on springs
 * (DESIGN.md §9.1); paper is matte, so the shadow does the rest. For cards
 * that aren't links themselves; link cards call useTilt on their own host.
 * The wrapper stays still; only the inner layer moves.
 */

export function Tilt({
  children,
  className,
  innerClassName = "rounded-card",
  degrees = 5,
  lift = 5,
}: {
  children: ReactNode;
  className?: string;
  /** Classes for the moving layer (give it the card's radius). */
  innerClassName?: string;
  degrees?: number;
  lift?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useTilt(host, inner, degrees, lift);
  return (
    <div ref={host} className={cn("[perspective:1000px]", className)}>
      <div ref={inner} className={cn("relative h-full will-change-transform", innerClassName)}>
        {children}
      </div>
    </div>
  );
}
