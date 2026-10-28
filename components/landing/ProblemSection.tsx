import landing from "@/content/landing.json";
import { citation } from "@/lib/citations";
import { SectionHeading } from "./SectionHeading";

/*
 * The myths (DESIGN.md §7.1 "Below the hero" item 1): a solid teal colour
 * block, about one screen tall, with three common myths about cancer, each
 * crossed through and answered by the fact, larger. Every fact is a cited
 * claim (content/citations.json), with its sources noted small and linked.
 */
export function ProblemSection() {
  const p = landing.problem;
  return (
    <section aria-labelledby="problem-title" className="py-6">
      <div className="bg-paper-teal px-4 py-14 sm:px-8 md:mx-3 md:rounded-frame md:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)] lg:items-center">
          <SectionHeading id="problem-title" title={p.title} light className="[&_.type-hero]:lg:text-[clamp(3rem,5.4vw,5.2rem)]">
            {p.close}
          </SectionHeading>
          <ul className="flex flex-col gap-3">
            {p.myths.map((m) => (
              <li key={m.myth} className="paper-card flex flex-col gap-2 rounded-card p-5">
                <p className="flex flex-wrap items-baseline gap-2 text-[15px] text-ink-500">
                  <span className="rounded-full bg-anomaly-100 px-2 py-0.5 text-[12px] font-semibold text-anomaly-700">Myth</span>
                  <s className="decoration-ink-500/60">{m.myth}</s>
                </p>
                <p className="text-[19px] font-semibold leading-snug text-ink-900">{m.fact}</p>
                <p className="flex flex-wrap gap-x-3 text-[13px]">
                  {/* One link per organisation (two pages from one source read as a repeat). */}
                  {m.citations.map((id, i) => {
                    const c = citation(id);
                    const repeat = m.citations.slice(0, i).some((prev) => citation(prev)?.source === c?.source);
                    return c && !repeat ? (
                      <a key={id} href={c.url} target="_blank" rel="noreferrer" className="w-fit text-ink-500 underline decoration-ink-900/20 underline-offset-2 hover:text-ink-900">
                        Source: {c.source}
                      </a>
                    ) : null;
                  })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
