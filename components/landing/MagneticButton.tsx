"use client";

import Link from "next/link";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { softClick } from "@/lib/sound";
import { live } from "./live";

/*
 * Magnetic pill button (CLAUDE.md §3.1.7): leans toward the cursor on hover,
 * and presses down in depth on click.
 */

interface Props {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  /** solid: pearl pill. glass: frosted pill. */
  variant?: "glass" | "solid";
  /** md: normal-case action. label: tiny uppercase, for header-style pills. */
  size?: "md" | "label";
  /** A small signal-blue dot before the label. */
  dot?: boolean;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function MagneticButton({
  children,
  onClick,
  href,
  variant = "glass",
  size = "md",
  dot = false,
  selected = false,
  disabled = false,
  className,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  const move = (e: PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || live.reducedMotion || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate3d(${dx * 0.22}px, ${dy * 0.32}px, 0)`;
  };
  const leave = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  const classes = cn(
    "group relative inline-flex rounded-full transition-transform duration-500 ease-[cubic-bezier(0.25,1.5,0.4,1)] will-change-transform",
    disabled && "pointer-events-none",
    className,
  );
  const face = cn(
    "flex items-center justify-center gap-2.5 rounded-full transition-[transform,box-shadow,background-color,color] duration-300 ease-lab group-active:scale-[0.94] group-active:shadow-[inset_0_3px_12px_rgba(5,6,10,0.55)]",
    size === "md" ? "px-5 py-3 text-[15px] font-medium tracking-[-0.01em]" : "type-label px-4 py-3",
    variant === "solid"
      ? "bg-pearl text-void group-hover:bg-white"
      : "glass text-pearl group-hover:bg-pearl group-hover:text-void",
    selected && "bg-pearl text-void",
    disabled && !selected && "opacity-35",
  );
  const handlers = {
    onPointerMove: move,
    onPointerLeave: leave,
    onPointerDown: softClick,
  };
  const content = (
    <span className={face}>
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-signal" />}
      {children}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        ref={(el) => {
          ref.current = el;
        }}
        className={classes}
        aria-label={ariaLabel}
        {...handlers}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      ref={(el) => {
        ref.current = el;
      }}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={selected || undefined}
      {...handlers}
    >
      {content}
    </button>
  );
}
