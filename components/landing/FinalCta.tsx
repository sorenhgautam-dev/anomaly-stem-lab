import landing from "@/content/landing.json";
import { AnoView } from "@/components/ano/AnoView";
import { Button } from "@/components/ui/Button";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { DividingCells } from "./DividingCells";

/*
 * The final call to action (DESIGN.md §7.1 item 7): a full-width solid teal
 * block, the cream headline "YOUR · TURN." with Ano waving in the gap, a
 * calm cluster of sage cells dividing behind it, one line and a cream pill.
 * Nothing else on it.
 */
export function FinalCta() {
  const c = landing.cta;
  return (
    <section aria-label="Start experimenting" className="py-8">
      {/* No `isolate` here: the cells draw in the shared site canvas, and the type and button must stay above it. */}
      <div className="relative overflow-hidden bg-paper-teal md:mx-3 md:rounded-frame">
        <DividingCells className="absolute inset-0" />
        <div className="relative flex min-h-[34rem] flex-col items-center justify-center gap-6 px-4 pb-20 pt-16 sm:px-8 md:min-h-[38rem]">
          <div className="relative w-full">
            <SplitHeadline as="h2" when="view" className="relative z-15 text-cream-50" left={c.left} right={c.right} gap={<span className="block w-[18vw]" />} />
            <AnoView className="relative mx-auto mt-2 h-60 w-48 md:absolute md:left-1/2 md:top-1/2 md:mt-0 md:h-[22rem] md:w-72 md:-translate-x-1/2 md:-translate-y-[60%]" expression="happy" action={{ move: "wave", key: 1 }} label="Ano, waving" />
          </div>
          <p className="relative z-20 max-w-md text-center text-lg leading-relaxed text-cream-100 md:mt-14">{c.line}</p>
          <Button href="/start" size="xl" variant="secondary" className="relative z-20 [&>span:first-child]:border-transparent [&>span:first-child]:bg-cream-50">
            {c.button}
          </Button>
        </div>
      </div>
    </section>
  );
}
