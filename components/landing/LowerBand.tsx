import type { ReactNode } from "react";
import { IconFlask } from "@/components/icons/icons";
import { InfoChipCard } from "@/components/ui/InfoChipCard";
import { ScrollCount } from "@/components/ui/ScrollCount";

/*
 * The hero's lower band (DESIGN.md §2 P6): a bold sentence and short body on
 * the left, the "How it works" chip in the centre, small caps meta on the
 * right; below, the carousel controls and the "Explore …" line. Stacks into
 * two rows at tablet width.
 */

export interface LowerBandText {
  heading: string;
  body: string;
  chip: { title: string; subtitle: string };
  meta: string[];
}

/** The line with its first number counting up as it appears. */
function withCount(text: string): ReactNode {
  const m = text.match(/\d+/);
  if (!m || m.index === undefined) return text;
  return (
    <>
      {text.slice(0, m.index)}
      <ScrollCount value={Number(m[0])} />
      {text.slice(m.index + m[0].length)}
    </>
  );
}

export function LowerBand({ text, controls, explore, tint }: { text: LowerBandText; controls: ReactNode; explore: string; tint?: "chem" | "robo" }) {
  return (
    <div data-hero-lower className="relative z-20 flex flex-col gap-5 px-4 pb-20 sm:px-8 sm:pb-24 md:pb-20">
      <div className="grid gap-5 md:grid-cols-2 md:items-end lg:grid-cols-[1.25fr_auto_1fr] lg:gap-10">
        <div className="max-w-[40rem]">
          <h2 className="type-heading text-[clamp(1.6rem,2.2vw,2.1rem)] leading-[1.05]">{text.heading}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-700 sm:text-base">{text.body}</p>
        </div>
        <InfoChipCard icon={<IconFlask />} tint={tint} title={text.chip.title} subtitle={text.chip.subtitle} href="#how-it-works" className="w-fit md:justify-self-end lg:justify-self-center" />
        <p className="type-eyebrow hidden text-right leading-relaxed text-ink-500 lg:block">
          {text.meta.map((m) => (
            <span key={m} className="block">
              {m}
            </span>
          ))}
        </p>
      </div>
      <div className="flex flex-col-reverse items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        {controls}
        <p className="text-[15px] font-medium text-ink-700">{withCount(explore)}</p>
      </div>
    </div>
  );
}
