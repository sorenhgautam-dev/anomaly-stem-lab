"use client";

import Link from "next/link";
import { useRef, type ComponentProps, type PointerEvent, type ReactNode, type Ref } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { ripple, useMagnetic } from "@/lib/motion";
import { softClick, unlockAudio } from "@/lib/sound";

/*
 * Pill buttons (DESIGN.md §5). The element itself is the hit area and never
 * moves; its face (background) lifts, sweeps a sheen and presses down inside
 * it, and the label leans toward the cursor (CLAUDE.md §10.1).
 */

const button = cva(
  "group relative inline-flex shrink-0 select-none items-center justify-center rounded-full font-sans font-semibold tracking-[-0.01em] outline-none disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "text-white",
        secondary: "text-ink-900",
        ghost: "text-ink-900",
      },
      size: {
        md: "h-11 px-5 text-[15px]",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-[17px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

const face = cva(
  "absolute inset-0 overflow-hidden rounded-full transition-[transform,box-shadow,background-color] duration-300 ease-out-soft group-hover:-translate-y-0.5 group-active:translate-y-0 group-active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary: "bg-ink-900 shadow-warm-sm group-hover:shadow-warm",
        secondary: "border border-ink-900/10 bg-white shadow-warm-sm group-hover:shadow-warm",
        ghost: "bg-ink-900/0 group-hover:bg-ink-900/5",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

type Variants = VariantProps<typeof button>;

interface Common extends Variants {
  children: ReactNode;
  className?: string;
  /** Icon placed after the label. */
  icon?: ReactNode;
}

type AsButton = Common & Omit<ComponentProps<"button">, keyof Common> & { href?: undefined };
type AsLink = Common & Omit<ComponentProps<typeof Link>, keyof Common> & { href: string };

export type ButtonProps = AsButton | AsLink;

export function Button(props: ButtonProps) {
  const { variant = "primary", size, className, children, icon, ...rest } = props;
  const host = useRef<HTMLElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);
  useMagnetic(host, inner, 5);

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    if (faceRef.current) ripple(faceRef.current, e.clientX, e.clientY, variant === "primary" ? "rgb(255 190 133 / 0.55)" : "rgb(255 122 31 / 0.25)");
    unlockAudio();
    softClick();
  };

  const content = (
    <>
      <span ref={faceRef} aria-hidden className={face({ variant })}>
        {variant === "primary" && (
          <span className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-[linear-gradient(90deg,transparent,var(--color-apricot-300),var(--color-flame-300),transparent)] opacity-0 transition-[transform,opacity] duration-700 ease-out-soft group-hover:translate-x-[420%] group-hover:opacity-30" />
        )}
      </span>
      <span className="relative transition-transform duration-300 ease-out-soft group-hover:-translate-y-0.5 group-active:translate-y-0 group-active:scale-[0.97]">
        <span ref={inner} className="inline-flex items-center gap-2 transition-transform duration-300 ease-out-soft">
          {children}
          {icon}
        </span>
      </span>
    </>
  );

  const classes = cn(button({ variant, size }), className);

  if (rest.href !== undefined) {
    return (
      <Link {...rest} ref={host as Ref<HTMLAnchorElement>} className={classes} onPointerUp={onPointerUp}>
        {content}
      </Link>
    );
  }
  const { type = "button", ...buttonRest } = rest;
  return (
    <button {...buttonRest} ref={host as Ref<HTMLButtonElement>} type={type} className={classes} onPointerUp={onPointerUp}>
      {content}
    </button>
  );
}
