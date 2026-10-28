import landing from "@/content/landing.json";
import { citation } from "@/lib/citations";
import { SectionHeading } from "./SectionHeading";

/*
 * The problem (DESIGN.md §7.1 "Below the hero" item 1): a solid teal colour
 * block with three short lines on why wrong ideas about cancer matter. Each
 * line is a cited claim (content/citations.json), with its source noted
 * small and linked.
 */
export function ProblemSection() {
  const p = landing.problem;
  return (
    <section aria-labelledby="problem-title" className="py-8">
      <div className="bg-paper-teal px-4 py-20 sm:px-8 md:mx-3 md:rounded-frame md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
          <SectionHeading id="problem-title" title={p.title} light>
            {p.close}
          </SectionHeading>
          <ol className="flex flex-col gap-4">
            {p.lines.map((l, i) => {
              const c = citation(l.citation);
              return (
                <li key={l.text} className="paper-card flex gap-4 rounded-card p-5">
                  <span className="type-readout pt-0.5 text-[13px] text-ink-500">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[17px] leading-relaxed text-ink-900">{l.text}</p>
                    {c && (
                      <a href={c.url} target="_blank" rel="noreferrer" className="w-fit text-[13px] text-ink-500 underline decoration-ink-900/20 underline-offset-2 hover:text-ink-900">
                        Source: {c.source}
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
