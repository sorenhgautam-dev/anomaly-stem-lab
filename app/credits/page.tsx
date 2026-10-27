import { ViewTransition } from "react";
import { Frame } from "@/components/ui/Frame";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SiteHeader } from "@/components/ui/SiteHeader";

export const metadata = { title: "Credits · ANOMALY" };

/*
 * Credits (CLAUDE.md §2 rule 8): the open-source work ANOMALY is built on,
 * each under a licence that lets this MIT project use it.
 */

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Fonts",
    items: [
      ["Archivo", "SIL Open Font License 1.1"],
      ["Geist and Geist Mono", "SIL Open Font License 1.1"],
    ],
  },
  {
    title: "3D and motion",
    items: [
      ["three.js", "MIT"],
      ["React Three Fiber and drei (pmndrs)", "MIT"],
      ["Lenis (darkroom.engineering)", "MIT"],
      ["Motion", "MIT"],
      ["maath", "MIT"],
      ["detect-gpu", "MIT"],
    ],
  },
  {
    title: "App",
    items: [
      ["Next.js and React", "MIT"],
      ["Tailwind CSS", "MIT"],
      ["Radix UI Dialog", "MIT"],
      ["class-variance-authority", "Apache-2.0"],
      ["zustand, zod, idb, clsx, tailwind-merge", "MIT / ISC"],
      ["Lucide icons", "ISC"],
      ["math.js", "Apache-2.0"],
    ],
  },
  {
    title: "Science",
    items: [["OpenStax Chemistry 2e, University Physics", "CC BY 4.0, used to check the theory pages"]],
  },
];

export default function CreditsPage() {
  return (
    <ViewTransition default="sunrise-wipe">
      <div className="flex min-h-dvh flex-col bg-cream-50">
        <Frame className="min-h-0 md:min-h-0">
          <SiteHeader />
          <main className="relative mx-auto w-full max-w-4xl flex-1 px-4 pb-40 pt-16 sm:px-8">
            <h1 className="type-hero text-[clamp(3.5rem,10vw,7rem)]">Credits</h1>
            <p className="mt-4 max-w-xl text-lg text-ink-700">ANOMALY is MIT licensed and built on open-source work. Thank you to everyone behind it.</p>
            <div className="mt-12 grid gap-10 sm:grid-cols-2">
              {GROUPS.map((g) => (
                <section key={g.title} aria-labelledby={`credits-${g.title}`}>
                  <h2 id={`credits-${g.title}`} className="type-eyebrow text-ink-500">
                    {g.title}
                  </h2>
                  <ul className="mt-3 flex flex-col gap-2">
                    {g.items.map(([name, licence]) => (
                      <li key={name} className="flex justify-between gap-4 border-b border-ink-900/[0.07] pb-2 text-[15px]">
                        <span className="font-medium text-ink-900">{name}</span>
                        <span className="text-right text-ink-500">{licence}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </main>
        </Frame>
        <SiteFooter />
      </div>
    </ViewTransition>
  );
}
