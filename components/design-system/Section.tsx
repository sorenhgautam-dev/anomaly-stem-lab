import type { ReactNode } from "react";

/* One labelled block of the /design-system page. */
export function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-ink-900/[0.08] py-12">
      <h2 id={`${id}-title`} className="type-heading text-3xl">
        {title}
      </h2>
      {note && <p className="mt-2 max-w-2xl text-[15px] text-ink-500">{note}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}
