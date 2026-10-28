import landing from "@/content/landing.json";
import { AnoView } from "@/components/ano/AnoView";
import { ShapesField } from "@/components/three/ShapesField";
import { LAB } from "@/lib/tokens";
import { Button } from "@/components/ui/Button";
import { Frame } from "@/components/ui/Frame";
import { SplitHeadline } from "@/components/ui/SplitHeadline";

/*
 * The final call to action (DESIGN.md §7.1): "YOUR · TURN." with Ano in the
 * gap, and lab specimens (in Chemistry's sand gold and teal) to knock
 * around behind the type.
 */
export function FinalCta() {
  const c = landing.cta;
  return (
    <section aria-label="Start experimenting" className="py-8">
      <Frame tint="sage" className="min-h-0 md:min-h-[38rem]">
        <ShapesField layout="cta" palette={{ a: LAB.chemistry.gold, b: LAB.chemistry.wall }} />
        <div className="relative flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-24 pt-16 sm:px-8 md:pb-28">
          <div className="relative w-full">
            <SplitHeadline as="h2" when="view" className="relative z-15" left={c.left} right={c.right} gap={<span className="block w-[18vw]" />} />
            <AnoView className="relative mx-auto mt-4 h-64 w-52 md:absolute md:left-1/2 md:top-1/2 md:mt-0 md:h-[24rem] md:w-80 md:-translate-x-1/2 md:-translate-y-[62%]" expression="celebrating" label="Ano, celebrating" />
          </div>
          <Button href="/start" size="xl" className="relative z-20 md:mt-16">
            {c.button}
          </Button>
        </div>
      </Frame>
    </section>
  );
}
