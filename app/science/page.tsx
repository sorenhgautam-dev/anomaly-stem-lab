import { ExploreBar } from "@/components/explore/ExploreBar";
import { HeadlineWithAno } from "@/components/explore/HeadlineWithAno";
import { IconCheck, IconCross } from "@/components/icons/icons";
import { Frame } from "@/components/ui/Frame";
import { LearningNote } from "@/components/ui/LearningNote";
import { CITATIONS } from "@/lib/citations";
import { cn } from "@/lib/cn";
import { EXPERIMENTS } from "@/lib/content";
import { validationResults } from "@/lib/validation";

export const metadata = { title: "The science · ANOMALY" };

/*
 * The science (DESIGN.md §7.7, CLAUDE.md §4): the validation results, each
 * computed by the real teaching models when this page is built (lib/
 * validation.ts, the same checks vitest runs), then every citation the site
 * uses: the claim in plain words, the source, a link and the date it was
 * checked. Only the four trusted sources appear (content/citations.json).
 */

export default function SciencePage() {
  const results = validationResults();
  const passed = results.filter((r) => r.pass).length;
  const used = new Set(EXPERIMENTS.flatMap((e) => e.citationIds ?? []));
  return (
    <Frame tint="sage">
      <ExploreBar />
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-14 px-4 pb-28 pt-10 sm:px-8 md:pt-14">
        <HeadlineWithAno left="The" right="science." line="Every fact here comes from a trusted cancer charity or health body. The simulations are tested against them." expression="thinking" sizeClassName="text-[clamp(4rem,19vw,6.5rem)] md:text-[clamp(4rem,10vw,9.5rem)]" />

        <section aria-labelledby="validation" className="flex flex-col gap-4">
          <h2 id="validation" className="type-heading text-3xl">
            Do the simulations match the science?
          </h2>
          <p className="text-[16px] leading-relaxed text-ink-700">
            {passed} of {results.length} checks pass. Each one runs the teaching model and checks it behaves the way the sources say.
          </p>
          <ul className="paper-card flex flex-col overflow-hidden rounded-card">
            {results.map((r) => (
              <li key={r.title} data-check={r.pass ? "pass" : "fail"} className="flex gap-3 border-b border-ink-900/10 px-5 py-4 last:border-b-0">
                <span aria-label={r.pass ? "Passed" : "Failed"} className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", r.pass ? "bg-verify-100 text-verify-700" : "bg-anomaly-100 text-anomaly-700")}>
                  {r.pass ? <IconCheck aria-hidden className="size-3.5" /> : <IconCross aria-hidden className="size-3.5" />}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] leading-snug text-ink-900">{r.title}</span>
                  <span className="text-[13px] text-ink-500">{r.experiment}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sources" className="flex flex-col gap-4">
          <h2 id="sources" className="type-heading text-3xl">
            Sources
          </h2>
          <p className="text-[16px] leading-relaxed text-ink-700">
            {CITATIONS.length} facts, from the World Health Organization, the National Cancer Institute, Cancer Research UK and the American Cancer Society. Each one was checked on its page; {used.size} back the experiments directly.
          </p>
          <ul className="flex flex-col gap-3">
            {CITATIONS.map((c) => (
              <li key={c.id} id={c.id} className="paper-card flex flex-col gap-1.5 rounded-card p-5">
                <p className="text-[16px] leading-relaxed text-ink-900">{c.claim}</p>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-500">
                  <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-semibold text-ink-900 underline decoration-ink-900/25 underline-offset-2 hover:decoration-ink-900">
                    {c.source}
                  </a>
                  <span>Checked {new Date(`${c.checked}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
        <LearningNote />
      </main>
    </Frame>
  );
}
