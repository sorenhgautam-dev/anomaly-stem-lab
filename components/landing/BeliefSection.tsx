import landing from "@/content/landing.json";
import { beliefItems, type BeliefItem } from "@/lib/beliefs";
import { BeliefDeck } from "./BeliefDeck";
import { ImpactCounter } from "./ImpactCounter";
import { SectionHeading } from "./SectionHeading";

/* The belief deck section: the real tricky ideas the cancer labs test, one card at a time, beside the live count of ideas busted by everyone. */

const COUNT = 9;

function wallBeliefs(): BeliefItem[] {
  return beliefItems().slice(0, COUNT);
}

export function BeliefSection() {
  return (
    <section aria-labelledby="belief-deck" className="mx-auto grid w-full max-w-7xl items-center gap-12 overflow-x-clip px-4 py-24 sm:px-8 sm:py-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex flex-col gap-8">
        <SectionHeading id="belief-deck" title={landing.beliefs.title}>
          {landing.beliefs.body}
        </SectionHeading>
        <ImpactCounter />
      </div>
      <BeliefDeck beliefs={wallBeliefs()} />
    </section>
  );
}
