import landing from "@/content/landing.json";
import { EXPERIMENTS, LAB_INFO } from "@/lib/content";
import { LabCard } from "./LabCard";
import { SectionHeading } from "./SectionHeading";

/* The two labs (DESIGN.md §7.1), with real experiment counts from content/. */
export function LabsSection() {
  const labs = (["chemistry", "robotics"] as const).map((id) => LAB_INFO.find((l) => l.id === id)!);
  return (
    <section aria-labelledby="labs" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-8 sm:py-32">
      <SectionHeading id="labs" title={landing.labs.title}>
        {landing.labs.body}
      </SectionHeading>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {labs.map((lab, i) => (
          <div key={lab.id} className="reveal" style={{ ["--reveal-end" as string]: `${75 + i * 12}%` }}>
            <LabCard lab={lab.id} title={lab.title} line={lab.line} count={EXPERIMENTS.filter((e) => e.lab === lab.id).length} cta={landing.labs.cta} />
          </div>
        ))}
      </div>
    </section>
  );
}
