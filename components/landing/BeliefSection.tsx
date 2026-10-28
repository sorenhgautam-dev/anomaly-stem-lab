import landing from "@/content/landing.json";
import { beliefItems, type BeliefItem } from "@/lib/beliefs";
import { BeliefDeck } from "./BeliefDeck";
import { SectionHeading } from "./SectionHeading";

/* The belief deck section: nine real beliefs, alternating labs, one card at a time. */

const COUNT = 9;

function wallBeliefs(): BeliefItem[] {
  const items = beliefItems();
  const chem = items.filter((b) => b.lab === "chemistry");
  const robo = items.filter((b) => b.lab === "robotics");
  const mixed: BeliefItem[] = [];
  for (let i = 0; mixed.length < COUNT && (i < chem.length || i < robo.length); i++) {
    if (robo[i]) mixed.push(robo[i]);
    if (chem[i] && mixed.length < COUNT) mixed.push(chem[i]);
  }
  return mixed;
}

export function BeliefSection() {
  return (
    <section aria-labelledby="belief-deck" className="mx-auto grid w-full max-w-7xl items-center gap-12 overflow-x-clip px-4 py-24 sm:px-8 sm:py-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <SectionHeading id="belief-deck" title={landing.beliefs.title}>
        {landing.beliefs.body}
      </SectionHeading>
      <BeliefDeck beliefs={wallBeliefs()} />
    </section>
  );
}
