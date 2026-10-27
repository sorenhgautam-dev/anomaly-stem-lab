"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { TheoryDef } from "@/engine/types";
import { cn } from "@/lib/cn";
import { IconButton } from "./IconButton";

/*
 * Theory sheet (DESIGN.md §5, §7.7): a Radix Dialog that slides in from the
 * right on desktop and up from the bottom on mobile. White, four sections
 * (What happened, Why, The formula, In real life) beside an animated diagram.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-ink-900/[0.08] pt-5">
      <h3 className="type-eyebrow text-ink-500">{title}</h3>
      <div className="mt-2 flex flex-col gap-3 text-[15px] leading-[1.6] text-ink-700">{children}</div>
    </section>
  );
}

export function TheorySheet({
  theory,
  open,
  onOpenChange,
  whatHappened,
  diagram,
  overlay = "dim",
}: {
  theory: TheoryDef | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** One or two sentences about this run, from the simulator's result. */
  whatHappened?: string;
  /** Animated diagram of the idea (particles, current paths, forces). */
  diagram?: ReactNode;
  /** "clear" keeps what's behind fully visible (the 3D lab acts as the diagram beside the sheet). */
  overlay?: "dim" | "clear";
}) {
  if (!theory) return null;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={cn("fixed inset-0 z-80 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in", overlay === "dim" ? "bg-ink-900/25" : "bg-transparent")} />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-80 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-sheet bg-white text-ink-900 shadow-warm-lg outline-none data-[state=closed]:animate-sheet-out-up data-[state=open]:animate-sheet-in-up md:inset-y-3 md:left-auto md:right-3 md:max-h-none md:w-[32rem] md:rounded-sheet md:data-[state=closed]:animate-sheet-out-right md:data-[state=open]:animate-sheet-in-right"
        >
          <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
            <div>
              <p className="type-eyebrow text-apricot-700">The theory</p>
              <Dialog.Title className="type-heading mt-1.5 text-[1.75rem] leading-[1.05]">{theory.title}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close the theory">
                <X />
              </IconButton>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">What happened in this experiment and the science behind it.</Dialog.Description>
          <div className="flex flex-col gap-5 overflow-y-auto px-6 pb-8">
            {diagram && <div className="overflow-hidden rounded-card bg-sunrise">{diagram}</div>}
            {whatHappened && (
              <Section title="What happened">
                <p>{whatHappened}</p>
              </Section>
            )}
            <Section title="Why">
              {theory.body.map((p) => (
                <p key={p.slice(0, 32)}>{p}</p>
              ))}
            </Section>
            {theory.equation && (
              <Section title="The formula">
                <p className="type-readout rounded-tile bg-cream-100 px-4 py-3 text-base text-ink-900">{theory.equation}</p>
              </Section>
            )}
            <Section title="In real life">
              <p>{theory.realWorld}</p>
            </Section>
            {theory.sources && theory.sources.length > 0 && (
              <p className="text-xs leading-relaxed text-ink-500">Checked against: {theory.sources.map((s) => s.split(". http")[0]).join("; ")}.</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
