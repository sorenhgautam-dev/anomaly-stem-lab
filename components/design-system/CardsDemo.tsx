import { IconFlask, IconRobot } from "@/components/icons/icons";
import { BeliefShiftCard } from "@/components/ui/BeliefShiftCard";
import { Button } from "@/components/ui/Button";
import { PaperCard } from "@/components/ui/PaperCard";
import { InfoChipCard } from "@/components/ui/InfoChipCard";
import { ResultCard } from "@/components/ui/ResultCard";
import { Paper } from "@/components/ui/Paper";
import { featuredCards } from "@/components/landing/featured";
import { beliefItems } from "@/lib/beliefs";
import { Section } from "./Section";

/* Paper, result, belief shift and info chip cards (DESIGN.md §5), filled with real engine output. */

const FEATURED = featuredCards();
const UNTESTED = beliefItems()[0];

export function CardsDemo() {
  return (
    <Section id="cards" title="Cards" note="Solid paper cards with a crisp edge and a short warm shadow. Each card floats on its own phase.">
      <div className="relative overflow-hidden rounded-frame p-6 sm:p-10">
        <Paper />
        <div className="relative grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* Real cards: the engine runs the featured scenarios (components/landing/featured.ts). */}
          {FEATURED.map((c, k) => (
            <ResultCard key={c.result.title} float phase={k * 2.1} {...c.result} action={k === 0 ? <Button size="md" className="w-full">Try it</Button> : undefined} />
          ))}
          {FEATURED.map((c, k) => (
            <BeliefShiftCard key={c.belief.title} float phase={1.2 + k * 2.1} title={c.belief.title} detail={c.belief.detail} tone={c.belief.tone} statusLabel={c.belief.status} href={c.href ?? undefined} />
          ))}
          <BeliefShiftCard title={UNTESTED.title} detail={UNTESTED.belief} tone="untested" statusLabel="Not yet tested" />
          <PaperCard className="flex flex-col gap-2">
            <p className="type-heading text-lg">Plain paper card</p>
            <p className="text-sm text-ink-500">Solid white, 1.5 px ink edge at 10%, fine grain, radius 18, crisp warm shadow.</p>
          </PaperCard>
          <div className="flex flex-col items-start gap-3">
            <InfoChipCard icon={<IconFlask />} title="How it works" subtitle="Predict, run, see where it broke" href="/" />
            <InfoChipCard icon={<IconFlask />} title="Chemistry lab" subtitle="Mix, heat and weigh" />
            <InfoChipCard icon={<IconRobot />} tint="robo" title="Robotics lab" subtitle="Circuits, robots and code" />
          </div>
        </div>
      </div>
    </Section>
  );
}
