"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { TheoryDef } from "@/engine/types";

/** "See the theory": a sheet over the lab (a real <dialog>, so focus is trapped). */
export function TheoryView({ theory, open, onClose }: { theory: TheoryDef | undefined; open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  if (!theory) return null;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[min(44rem,calc(100vw-2rem))] max-h-[85dvh] overflow-y-auto rounded-[28px] border border-pearl/12 bg-void/95 p-0 text-pearl backdrop:bg-void/70 backdrop:backdrop-blur-sm"
    >
      <div className="p-7 sm:p-10">
        <div className="flex items-start justify-between gap-6">
          <h2 className="type-headline text-[clamp(2.25rem,5vw,3.5rem)]">{theory.title}</h2>
          <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-pearl/10" aria-label="Close the theory">
            <X className="size-5" />
          </button>
        </div>
        {theory.equation && (
          <p className="mt-6 inline-block rounded-2xl border border-pearl/12 bg-pearl/5 px-5 py-3 font-mono text-lg text-signal">{theory.equation}</p>
        )}
        <div className="mt-6 flex flex-col gap-4 text-[17px] leading-[1.6] text-pearl/85">
          {theory.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-8 rounded-2xl bg-pearl/5 p-5">
          <p className="type-label text-lilac">In real life</p>
          <p className="mt-2 text-[16px] leading-relaxed text-pearl/85">{theory.realWorld}</p>
        </div>
        {theory.sources && theory.sources.length > 0 && (
          <div className="mt-6">
            <p className="type-label text-pearl/45">Sources</p>
            <ul className="mt-2 flex flex-col gap-1 text-[13px] text-pearl/60">
              {theory.sources.map((s) => (
                <li key={s}>{/^https?:\/\//.test(s) ? <a className="underline-offset-4 hover:underline" href={s} target="_blank" rel="noreferrer">{s}</a> : s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </dialog>
  );
}
