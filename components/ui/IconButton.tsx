"use client";

import Link from "next/link";
import { useRef, type ComponentProps, type ReactNode, type Ref } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { useMagnetic } from "@/lib/motion";
import { softClick, resumeAudio } from "@/lib/sound";

/*
 * Round icon button (DESIGN.md §5): a 48 px white circle with a warm shadow.
 * The element is the hit area; only its face lifts on hover and the icon
 * leans toward the cursor (CLAUDE.md §10.1).
 */

const shell = cva("group relative inline-grid shrink-0 place-items-center rounded-full outline-none disabled:pointer-events-none disabled:opacity-40", {
  variants: {
    size: { md: "size-12", sm: "size-11" },
    tone: { light: "text-ink-900", dark: "text-white" },
  },
  defaultVariants: { size: "md", tone: "light" },
});

const face = cva(
  "absolute inset-0 rounded-full transition-[transform,box-shadow] duration-300 ease-out-soft group-hover:-translate-y-0.5 group-active:translate-y-0 group-active:scale-95",
  {
    variants: {
      tone: {
        light: "bg-white shadow-warm-sm group-hover:shadow-warm",
        dark: "bg-ink-900 shadow-warm-sm group-hover:shadow-warm",
      },
    },
    defaultVariants: { tone: "light" },
  },
);

interface Common extends VariantProps<typeof shell> {
  /** Required: icon buttons have no visible text. */
  label: string;
  children: ReactNode;
  className?: string;
}

type AsButton = Common & Omit<ComponentProps<"button">, keyof Common | "aria-label"> & { href?: undefined };
type AsLink = Common & Omit<ComponentProps<typeof Link>, keyof Common | "aria-label"> & { href: string };

export function IconButton(props: AsButton | AsLink) {
  const { label, children, className, size, tone, ...rest } = props;
  const host = useRef<HTMLElement>(null);
  const icon = useRef<HTMLSpanElement>(null);
  useMagnetic(host, icon, 4);
  const inner = (
    <>
      <span aria-hidden className={face({ tone })} />
      <span aria-hidden className="relative transition-transform duration-300 ease-out-soft group-hover:-translate-y-0.5 group-active:translate-y-0 [&_svg]:size-5 [--icon-tone:var(--color-apricot-500)]">
        <span ref={icon} className="block">
          {children}
        </span>
      </span>
    </>
  );
  const classes = cn(shell({ size, tone }), className);
  const press = () => {
    resumeAudio();
    softClick();
  };
  if (rest.href !== undefined) {
    return (
      <Link {...rest} ref={host as Ref<HTMLAnchorElement>} aria-label={label} className={classes} onPointerUp={press}>
        {inner}
      </Link>
    );
  }
  const { type = "button", ...buttonRest } = rest;
  return (
    <button {...buttonRest} ref={host as Ref<HTMLButtonElement>} type={type} aria-label={label} className={classes} onPointerUp={press}>
      {inner}
    </button>
  );
}
