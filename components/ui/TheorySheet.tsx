"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { IconClose } from "@/components/icons/icons";
import type { TheoryDef, TryAtHome } from "@/engine/types";
import { citationsFor } from "@/lib/citations";
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
      <h3 className="type-heading text-base">{title}</h3>
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
  afterWhy,
  tryAtHome,
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
  /** Shown under the Why section, e.g. "Explain it simpler". */
  afterWhy?: ReactNode;
  /** A safe version to try at home with an adult, where one exists (DESIGN.md §5). */
  tryAtHome?: TryAtHome;
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
              <p className="type-label text-apricot-700">The theory</p>
              <Dialog.Title className="type-heading mt-1.5 text-[1.75rem] leading-[1.05]">{theory.title}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close the theory">
                <IconClose />
              </IconButton>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">What happened in this experiment and the science behind it.</Dialog.Description>
          <div className="flex flex-col gap-5 overflow-y-auto px-6 pb-8">
            {diagram && <div className="overflow-hidden rounded-card bg-paper">{diagram}</div>}
            {whatHappened && (
              <Section title="What happened">
                <p>{whatHappened}</p>
              </Section>
            )}
            <Section title="Why it happened">
              {theory.body.map((p) => (
                <p key={p.slice(0, 32)}>{p}</p>
              ))}
              {afterWhy}
            </Section>
            {theory.equation && (
              <Section title="The science">
                <p className="type-readout rounded-tile bg-cream-100 px-4 py-3 text-base text-ink-900">{theory.equation}</p>
              </Section>
            )}
            <Section title="In real life">
              <p>{theory.realWorld}</p>
            </Section>
            {tryAtHome && (
              <Section title={`Try it at home: ${tryAtHome.title}`}>
                <ol data-try-at-home className="flex list-decimal flex-col gap-1.5 pl-5">
                  {tryAtHome.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p>
                  <span className="font-semibold text-ink-900">Watch for: </span>
                  {tryAtHome.watch}
                </p>
                <p className="rounded-tile bg-cream-100 px-3 py-2 text-[14px]">
                  <span className="font-semibold text-ink-900">Stay safe: </span>
                  {tryAtHome.safety}
                </p>
              </Section>
            )}
            {theory.citationIds && theory.citationIds.length > 0 && (
              <Section title="Sources">
                <ul className="flex flex-col gap-2.5">
                  {citationsFor(theory.citationIds).map((c) => (
                    <li key={c.id} className="text-[14px] leading-snug">
                      <a href={c.url} target="_blank" rel="noreferrer" className="font-semibold text-ink-900 underline decoration-ink-900/25 underline-offset-2 hover:decoration-ink-900">
                        {c.source}
                      </a>
                      <span className="text-ink-500">: {c.claim}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {theory.model && <p className="rounded-tile bg-cream-100 px-3 py-2 text-[13px] leading-relaxed text-ink-700">{theory.model}</p>}
            {theory.sources && theory.sources.length > 0 && (
              <p className="text-xs leading-relaxed text-ink-500">Checked against: {theory.sources.map((s) => s.split(". http")[0]).join("; ")}.</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
