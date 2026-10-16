import { cn } from "@/lib/cn";

/** Ano's one short line that guides each step of the flow (CLAUDE.md §1.1). */
export function AnoLine({ text, className }: { text: string; className?: string }) {
  return (
    <p className={cn("flex max-w-xl items-start gap-3 text-[17px] leading-[1.45] text-pearl/80", className)}>
      <span
        aria-hidden
        className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(237,235,255,0.9),rgba(184,166,255,0.35)_45%,rgba(5,6,10,0.9)_75%)] shadow-[0_0_18px_2px_rgba(184,166,255,0.45)]"
      >
        <span className="h-[3px] w-2.5 rounded-full bg-lilac shadow-[0_0_6px_1px_rgba(184,166,255,0.9)]" />
      </span>
      <span>
        <span className="sr-only">Ano says: </span>
        {text}
      </span>
    </p>
  );
}
