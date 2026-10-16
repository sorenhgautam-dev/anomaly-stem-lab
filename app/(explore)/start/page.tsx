import Link from "next/link";
import { AnoLine } from "@/components/explore/AnoLine";
import { comingSoonFor, experimentsFor, LAB_IDS, LEVEL_INFO } from "@/lib/content";

export const metadata = { title: "Choose your level · ANOMALY" };

// Choose your level (CLAUDE.md §1.1): three rows, each with its grade band,
// a one-line description and how many experiments it has.
export default function StartPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-16 pt-32 sm:px-10 sm:pt-40">
      <h1 className="type-headline text-[clamp(3.25rem,8vw,7.5rem)]">
        Pick your <span className="type-accent">level</span>
      </h1>
      <AnoLine className="mt-6" text="Not sure? Start with Easy. You can switch level or lab at any time from the top bar." />

      <ol className="mt-14 border-t border-pearl/12">
        {LEVEL_INFO.map((level, i) => {
          const playable = LAB_IDS.reduce((n, lab) => n + experimentsFor(lab, level.id).length, 0);
          const soon = LAB_IDS.reduce((n, lab) => n + comingSoonFor(lab, level.id).length, 0);
          return (
            <li key={level.id} className="border-b border-pearl/12">
              <Link
                href={`/start/${level.id}`}
                className="group grid grid-cols-1 items-baseline gap-x-10 gap-y-3 py-8 transition-colors duration-500 ease-lab hover:bg-pearl/[0.04] sm:grid-cols-[5rem_1fr_16rem] sm:px-4 sm:py-10"
              >
                <span className="font-mono text-sm text-lilac">0{i + 1}</span>
                <span>
                  <span className="type-headline block text-[clamp(2.75rem,6vw,5.5rem)] transition-transform duration-500 ease-lab group-hover:translate-x-3">
                    {level.title}
                  </span>
                  <span className="mt-3 block max-w-xl text-[17px] leading-[1.45] text-pearl/70">{level.line}</span>
                </span>
                <span className="flex flex-col gap-2 sm:items-end">
                  <span className="type-label text-pearl/80">{level.grades}</span>
                  <span className="type-label text-pearl/45">
                    {playable} experiments{soon > 0 ? ` · ${soon} coming soon` : ""}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
