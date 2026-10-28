"use client";

import Link from "next/link";
import { getExperiment, labInfo, levelInfo } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import { findRoots, ROOT_AFTER, rootLine, wrongGuesses } from "@/lib/root-beliefs";

/*
 * My ideas: the root ideas behind the student's wrong guesses (lib/root-beliefs.ts).
 * Each card names the bigger idea, says how many wrong guesses grew from it,
 * and links the experiments where it showed up. Until two wrong guesses
 * share a root, it says what will appear here. Saved progress only, once loaded.
 */

export function RootBeliefs() {
  const hydrated = useProgress((s) => s.hydrated);
  const suspected = useProgress((s) => s.suspected);
  const roots = hydrated ? findRoots(suspected) : [];
  const guesses = hydrated ? wrongGuesses(suspected).length : 0;

  return (
    <section aria-labelledby="root-ideas" data-root-count={roots.length} className="flex flex-col gap-3">
      <h2 id="root-ideas" className="type-heading text-2xl">
        The idea behind your guesses
      </h2>
      {roots.length === 0 ? (
        <p className="paper-card rounded-card p-5 text-[15px] leading-relaxed text-ink-700">
          {guesses === 0
            ? "No surprises yet. When a guess doesn't match, Ano works out the idea behind it."
            : `No pattern yet. When ${ROOT_AFTER} of your wrong guesses come from the same bigger idea, Ano shows it here.`}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {roots.map((m) => (
            <li key={m.root.id} data-root={m.root.id} className="paper-card flex flex-col gap-3 rounded-card p-5">
              <p className="type-heading text-xl leading-snug">{m.root.title}</p>
              <p className="-mt-1 text-[15px] leading-relaxed text-ink-700">{rootLine(m)}</p>
              <div className="flex flex-col gap-2">
                <p className="text-[13px] font-semibold text-ink-700">Where it showed up</p>
                <ul className="flex flex-wrap gap-2">
                  {m.experimentIds.map((id) => {
                    const e = getExperiment(id)!;
                    return (
                      <li key={id}>
                        <Link href={`/labs/${e.lab}/${e.level}/${e.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink-900/10 bg-cream-50 px-4 text-[14px] font-semibold text-ink-900 transition-colors hover:bg-cream-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900">
                          {e.title}
                          <span className="font-normal text-ink-500">
                            {labInfo(e.lab).title.replace(" Lab", "")} · {levelInfo(e.level).title}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
