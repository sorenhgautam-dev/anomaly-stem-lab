import { cn } from "@/lib/cn";
import { anton, bricolage } from "./fonts";
import { Section } from "./Section";

/* The type scale (DESIGN.md §4) and the hero font comparison. */

const FONTS = [
  {
    id: "archivo",
    name: "Archivo Variable",
    detail: "Chosen. 900 weight, width 68 (condensed), OFL-1.1. Has a width axis, so the condensed cut and the normal-width headings share one family.",
    className: "font-display font-black [font-stretch:68%]",
  },
  {
    id: "anton",
    name: "Anton",
    detail: "Alternative. One weight (regular, already very heavy and condensed), OFL-1.1. No width or weight axis.",
    className: cn(anton.className, "font-normal"),
  },
  {
    id: "bricolage",
    name: "Bricolage Grotesque",
    detail: "Alternative. 800 weight, width 75 (its narrowest), OFL-1.1. Friendlier, with ink traps; not as condensed.",
    className: cn(bricolage.className, "font-extrabold [font-stretch:75%]"),
  },
];

export function FontComparison() {
  return (
    <Section id="fonts" title="Font comparison" note="The hero headline in Archivo and the two alternatives from DESIGN.md §4, at the same size. Screenshots: tests/screenshots/round-1/fonts-*.png.">
      <div className="flex flex-col gap-6">
        {FONTS.map((f) => (
          <figure key={f.id} data-font={f.id} className="overflow-hidden rounded-card bg-sunrise p-6 shadow-warm-sm sm:p-8">
            <p aria-hidden className={cn("whitespace-nowrap text-[clamp(3rem,9vw,8rem)] uppercase leading-[0.85] tracking-[-0.03em] text-ink-900", f.className)}>
              Predict&ensp;Test it.
            </p>
            <figcaption className="mt-5 max-w-2xl">
              <span className="block text-base font-semibold">{f.name}</span>
              <span className="block text-sm text-ink-500">{f.detail}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

export function TypeScale() {
  return (
    <Section id="type" title="Type" note="Archivo for display and headings, Geist for body and UI, Geist Mono for readouts.">
      <div className="flex flex-col gap-6">
        <p className="type-hero text-[clamp(4rem,13vw,11rem)]">Predict</p>
        <h3 className="type-heading text-5xl">Learn why your intuition tripped.</h3>
        <h4 className="type-heading text-3xl">Heading three, sentence case</h4>
        <p className="type-heading text-xl">Heading four and card titles</p>
        <p className="max-w-xl text-lg leading-relaxed text-ink-700">Body large, 18 px. Guess what will happen. Run it. Ano shows you exactly where your thinking broke.</p>
        <p className="max-w-xl text-[15px] leading-relaxed text-ink-700">Body, 15 px. Short sentences, plenty of room, warm and friendly.</p>
        <p className="type-eyebrow text-ink-500">Belief shift · small caps meta</p>
        <p className="type-readout text-2xl">3.00 V · 14.2 mA · 130.00 g</p>
        <p className="bg-win bg-clip-text font-display text-6xl font-black uppercase text-transparent [font-stretch:68%]">Nailed it.</p>
        <p className="bg-glitch bg-clip-text font-display text-6xl font-black uppercase text-transparent [font-stretch:68%]">Anomaly.</p>
      </div>
    </Section>
  );
}
