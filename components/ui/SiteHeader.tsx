"use client";

import Link from "next/link";
import { useState } from "react";
import { IconClose, IconMenu } from "@/components/icons/icons";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Logo } from "./Logo";
import { RollLabel } from "./RollLabel";
import { SoundToggle } from "./SoundToggle";

/*
 * The header (DESIGN.md §2 P2): logo left, text nav links, one black pill
 * call to action right, with the mute toggle beside it (CLAUDE.md §3.1).
 * Below md the links fold into a menu.
 */

const NAV = [
  { href: "/start", label: "Labs" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#meet-ano", label: "Meet Ano" },
  { href: "/beliefs", label: "My ideas" },
];

export function SiteHeader({ cta = { href: "/start", label: "Start experimenting" }, className }: { cta?: { href: string; label: string }; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className={cn("relative z-30 flex items-center justify-between gap-4 px-4 pt-4 sm:px-6 md:px-8 md:pt-5", className)}>
      <Logo />
      <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="group/roll inline-flex h-11 items-center rounded-full px-4 text-[15px] font-medium text-ink-700 transition-colors duration-200 hover:bg-ink-900/[0.06] hover:text-ink-900">
            <RollLabel text={n.label} />
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <SoundToggle />
        <Button href={cta.href} className="hidden sm:inline-flex">
          {cta.label}
        </Button>
        <IconButton label={open ? "Close menu" : "Open menu"} className="md:hidden" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((o) => !o)}>
          {open ? <IconClose /> : <IconMenu />}
        </IconButton>
      </div>
      {open && (
        <nav id="site-menu" aria-label="Main" className="paper-card absolute inset-x-4 top-[4.5rem] flex animate-pop-in flex-col rounded-card p-2 md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="flex h-12 items-center rounded-[0.875rem] px-4 text-base font-medium text-ink-900 hover:bg-ink-900/[0.05]">
              {n.label}
            </Link>
          ))}
          <Button href={cta.href} size="lg" className="mt-1">
            {cta.label}
          </Button>
        </nav>
      )}
    </header>
  );
}
