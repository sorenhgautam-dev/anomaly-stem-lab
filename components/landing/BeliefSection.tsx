import landing from "@/content/landing.json";
import { beliefItems, type BeliefItem } from "@/lib/beliefs";
import { BeliefWall } from "./BeliefWall";
import { SectionHeading } from "./SectionHeading";

/* The belief wall section: nine real beliefs, alternating labs. */

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
    <section aria-labelledby="belief-wall" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-8 sm:py-32">
      <SectionHeading id="belief-wall" title={landing.beliefs.title}>
        {landing.beliefs.body}
      </SectionHeading>
      <BeliefWall beliefs={wallBeliefs()} />
    </section>
  );
}
