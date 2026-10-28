import landing from "@/content/landing.json";
import { EXPERIMENTS, VISIBLE_LAB_INFO } from "@/lib/content";
import { LabCard } from "./LabCard";
import { LabsScene } from "./LabsScene";
import { SectionHeading } from "./SectionHeading";

/*
 * The four cancer labs in story order (DESIGN.md §7.1 item 3), in the landing's black and gold
 * stretch (app/page.tsx), with real experiment counts from content/. On wide
 * screens the section pins and the two cards rise and turn into place with
 * the scroll while their 3D cameras fly in to each bench (LabObjectView
 * reads scenes.labs). Pattern studied from Skiper's "Card stack with gsap
 * and rotate", our own code.
 */
export function LabsSection() {
  const labs = VISIBLE_LAB_INFO;
  return (
    <LabsScene labelledBy="labs">
      <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-8 sm:py-32">
        <SectionHeading id="labs" title={landing.labs.title} light className="mx-auto text-center">
          {landing.labs.body}
        </SectionHeading>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {labs.map((lab) => (
            // A gold hairline keeps each card's edge on the night block (Robotics' graphite card would melt into it).
            <div key={lab.id} data-labs-card className="rounded-frame ring-1 ring-robo-gold/40">
              <LabCard lab={lab.id} title={lab.title} line={lab.line} count={EXPERIMENTS.filter((e) => e.lab === lab.id).length} cta={landing.labs.cta} scrollScene />
            </div>
          ))}
        </div>
      </div>
    </LabsScene>
  );
}
