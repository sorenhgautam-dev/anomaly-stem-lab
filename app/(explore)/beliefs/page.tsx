import { AnoLine } from "@/components/explore/AnoLine";
import { MisconceptionMap, type MapBelief } from "@/components/map/MisconceptionMap";
import { allMisconceptions, EXPERIMENTS } from "@/lib/content";

export const metadata = { title: "Your belief map · ANOMALY" };

// The misconception map (CLAUDE.md §11): spotted beliefs glow, broken ones shatter.
export default function BeliefsPage() {
  const beliefs: MapBelief[] = allMisconceptions().map((m) => ({
    ...m,
    tests: EXPERIMENTS.filter((e) => e.misconceptions.includes(m.id)).map((e) => ({
      title: e.title,
      href: `/labs/${e.lab}/${e.level}/${e.id}`,
    })),
  }));
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-10 pt-28 sm:px-10 sm:pt-36">
      <h1 className="type-headline text-[clamp(3rem,7vw,6.5rem)]">
        Your belief <span className="type-accent">map</span>
      </h1>
      <AnoLine
        className="mb-8 mt-5"
        text="Every idea I can spot is here. The ones I've seen in your runs glow. Break one with a correct run and it shatters."
      />
      <MisconceptionMap beliefs={beliefs} />
    </main>
  );
}
