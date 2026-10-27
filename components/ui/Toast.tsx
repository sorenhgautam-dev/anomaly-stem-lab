"use client";

import { create } from "zustand";

/*
 * Toasts (DESIGN.md §5): small glass cards bottom-centre that pop in and
 * leave on their own. Call toast("Saved") from anywhere; mount <Toaster />
 * once.
 */

interface ToastItem {
  id: number;
  text: string;
}

const useToasts = create<{ items: ToastItem[] }>()(() => ({ items: [] }));
let nextId = 1;

export function toast(text: string, ms = 3200): void {
  const id = nextId++;
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id, text }] }));
  window.setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), ms);
}

export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-90 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <p key={t.id} className="glass-card animate-pop-in rounded-full px-4 py-2.5 text-sm font-medium text-ink-900 motion-reduce:animate-none">
          {t.text}
        </p>
      ))}
    </div>
  );
}
