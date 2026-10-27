import { PALETTE } from "@/lib/tokens";
import { cn } from "@/lib/cn";
import { Section } from "./Section";

/* Colour ramps, signature gradients, shadows and radii (DESIGN.md §3, §5). */

// Static class names so Tailwind generates them.
const RAMPS: { name: keyof typeof PALETTE; swatches: [string, string][] }[] = [
  { name: "cream", swatches: [["50", "bg-cream-50"], ["100", "bg-cream-100"], ["200", "bg-cream-200"], ["300", "bg-cream-300"]] },
  { name: "ink", swatches: [["900", "bg-ink-900"], ["700", "bg-ink-700"], ["500", "bg-ink-500"], ["300", "bg-ink-300"]] },
  { name: "apricot", swatches: [["100", "bg-apricot-100"], ["200", "bg-apricot-200"], ["300", "bg-apricot-300"], ["400", "bg-apricot-400"], ["500", "bg-apricot-500"], ["600", "bg-apricot-600"], ["700", "bg-apricot-700"]] },
  { name: "flame", swatches: [["200", "bg-flame-200"], ["300", "bg-flame-300"], ["400", "bg-flame-400"], ["500", "bg-flame-500"]] },
  { name: "volt", swatches: [["100", "bg-volt-100"], ["300", "bg-volt-300"], ["400", "bg-volt-400"], ["500", "bg-volt-500"], ["600", "bg-volt-600"]] },
  { name: "grape", swatches: [["300", "bg-grape-300"], ["400", "bg-grape-400"], ["500", "bg-grape-500"]] },
  { name: "verify", swatches: [["100", "bg-verify-100"], ["500", "bg-verify-500"], ["700", "bg-verify-700"]] },
  { name: "anomaly", swatches: [["100", "bg-anomaly-100"], ["500", "bg-anomaly-500"], ["700", "bg-anomaly-700"]] },
];

const GRADIENTS: [string, string][] = [
  ["Sunrise", "bg-sunrise"],
  ["Ribbon", "bg-ribbon"],
  ["Chem", "bg-chem"],
  ["Robo", "bg-robo"],
  ["Level Easy", "bg-level-easy"],
  ["Level Medium", "bg-level-medium"],
  ["Level Advanced", "bg-level-advanced"],
  ["Win", "bg-win"],
  ["Glitch", "bg-glitch"],
];

export function Swatches() {
  return (
    <>
      <Section id="colour" title="Colour ramps" note="About 70% cream and white, 20% ink, 10% vibrant colour. Verify and anomaly are for verdicts only.">
        <div className="grid gap-5 lg:grid-cols-2">
          {RAMPS.map((ramp) => (
            <div key={ramp.name}>
              <p className="text-sm font-semibold capitalize">{ramp.name}</p>
              <div className="mt-2 flex overflow-hidden rounded-card shadow-warm-sm">
                {ramp.swatches.map(([shade, cls]) => (
                  <div key={shade} className={cn("flex h-20 flex-1 flex-col justify-end p-2", cls)}>
                    <span className="type-readout w-fit rounded-md bg-white/85 px-1.5 py-0.5 text-[11px] text-ink-900">
                      {shade} {(PALETTE[ramp.name] as Record<string, string>)[shade]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section id="gradients" title="Signature gradients">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {GRADIENTS.map(([name, cls]) => (
            <div key={name} className={cn("flex h-28 items-end rounded-card p-3 shadow-warm-sm", cls)}>
              <span className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-ink-900">{name}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section id="surfaces" title="Shadows and radii" note="Warm-tinted shadows, never grey. Radius follows hierarchy: frame 32, sheet 28, card 20, tile 10.">
        <div className="flex flex-wrap gap-6">
          {[
            ["shadow-warm-sm", "rounded-tile"],
            ["shadow-warm", "rounded-card"],
            ["shadow-warm-lg", "rounded-sheet"],
            ["shadow-warm-lg", "rounded-frame"],
          ].map(([shadow, radius]) => (
            <div key={shadow + radius} className={cn("grid size-36 place-items-center bg-white text-center text-xs font-semibold text-ink-700", shadow, radius)}>
              {shadow}
              <br />
              {radius}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
