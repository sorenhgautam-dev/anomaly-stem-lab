"use client";

import { useRef } from "react";
import { IconPause, IconPlay } from "@/components/icons/icons";
import landing from "@/content/landing.json";
import { cn } from "@/lib/cn";
import { ShapesField, type SpecimenPalette } from "@/components/three/ShapesField";
import type { AnoMove } from "@/components/ano/types";
import { Button } from "@/components/ui/Button";
import { CarouselControls } from "@/components/ui/CarouselControls";
import { Frame } from "@/components/ui/Frame";
import { IconButton } from "@/components/ui/IconButton";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { StageCard, type StageTone } from "@/components/ui/StageCard";
import { LAB } from "@/lib/tokens";
import { SLIDES } from "./featured";
import { HeroCards, type HeroCardData } from "./HeroCards";
import { HeroHeadline } from "./HeroHeadline";
import { HeroStage } from "./HeroStage";
import { LowerBand } from "./LowerBand";
import { useCarousel } from "./useCarousel";
import { useHeroScene } from "./useHeroScene";

/*
 * The landing hero (DESIGN.md §7.1, patterns P1–P7): a carousel of three
 * cancer experiments, each in its lab's colours: chemo and hair (Treatment),
 * how tumours grow (Detection), cells out of control (Cell). The stage card
 * holds the slide's real apparatus in 3D with Ano beside it (HeroStage), its
 * readout the same value as the cards, which the simulator fills
 * (`featured`, computed on the server by featured.ts). Changing slide
 * cross-fades the stage, the floating specimens, the ribbon and a faint tint
 * of the page to the next lab's colours; orange stays on Ano. "Try it" opens
 * the slide's experiment. The headline sits above the site canvas (z-15) so
 * the specimens pass behind its letters; where it crosses a dark stage card
 * its letters turn white (HeroHeadline).
 */

/** Each slide's lab colours: the specimens' two colours, the page's tint, the ribbon, the chip and the How it works tile. */
const LOOK: Record<StageTone, { specimens: SpecimenPalette; tint: string; ribbon: string; chip: string; lab: "chem" | "robo" }> = {
  treatment: {
    specimens: { a: LAB.robotics.gold, b: LAB.robotics.teal },
    tint: "bg-robo-wall/[0.05]",
    ribbon: "[--ribbon-1:var(--color-robo-stage-2)] [--ribbon-2:var(--color-robo-wall)] [--ribbon-3:var(--color-robo-stage)]",
    chip: "bg-robo-gold text-ink-900",
    lab: "robo",
  },
  detection: {
    specimens: { a: LAB.robotics.teal, b: LAB.robotics.gold },
    tint: "bg-robo-teal/[0.06]",
    ribbon: "[--ribbon-1:color-mix(in_oklab,var(--color-robo-teal)_35%,var(--color-robo-deep))] [--ribbon-2:var(--color-robo-wall)] [--ribbon-3:var(--color-robo-deep)]",
    chip: "bg-robo-teal text-ink-900",
    lab: "robo",
  },
  cell: {
    specimens: { a: LAB.chemistry.gold, b: LAB.chemistry.sage },
    tint: "bg-chem-wall/[0.06]",
    ribbon: "[--ribbon-1:color-mix(in_oklab,var(--color-chem-wall)_40%,white)] [--ribbon-2:var(--color-chem-wall)] [--ribbon-3:var(--color-chem-floor)]",
    chip: "bg-chem-gold text-ink-900",
    lab: "chem",
  },
};

/** The stage: the stage card's own box on desktop (Ano's head reaches into the headline's gap); a card of its own under the headline on phones. */
const STAGE = "relative order-2 mx-auto mt-4 h-[24rem] w-full max-w-[26rem] md:absolute md:bottom-[3%] md:left-1/2 md:top-[clamp(4.4rem,8vw,7.4rem)] md:mt-0 md:h-auto md:w-[min(31rem,36%)] md:max-w-none md:-translate-x-1/2";
/** The hero headline: DESIGN.md §4's clamp(4rem, 13vw, 11rem) on desktop. */
const HEADLINE = "text-[clamp(4.5rem,24vw,7.5rem)] md:text-[clamp(4rem,12.4vw,11rem)]";
const ANO = landing.slides.map((s) => s.ano);

export function Hero({ count, featured }: { count: number; featured: HeroCardData[] }) {
  const { index, go, paused, setPaused, bind } = useCarousel(SLIDES.length);
  const frame = useRef<HTMLDivElement>(null);
  useHeroScene(frame);
  const tone = SLIDES[index].id;
  const look = LOOK[tone];
  return (
    // Scrolling the hero away plays its scroll scene (useHeroScene).
    <div ref={frame}>
      <Frame className={cn(look.ribbon, "[transition:--ribbon-1_700ms,--ribbon-2_700ms,--ribbon-3_700ms]")}>
        {/* A faint tint of the slide's colours over the paper, under the 3D. */}
        <div aria-hidden className={cn("pointer-events-none absolute inset-0 transition-colors duration-700 ease-out-soft", look.tint)} />
        <ShapesField layout="hero" palette={look.specimens} />
        <SiteHeader />
        <section aria-roledescription="carousel" aria-label="Featured experiments" className="relative flex flex-1 flex-col" {...bind}>
          <div className="relative flex flex-1 flex-col px-4 pt-6 sm:px-8 md:min-h-[34rem] md:pt-7">
            <StageCard tone={tone} className="bottom-[3%] left-1/2 top-[clamp(4.4rem,8vw,7.4rem)] hidden w-[min(31rem,36%)] -translate-x-1/2 md:block" />
            <HeroStage tone={tone} values={Object.fromEntries(SLIDES.map((s, i) => [s.id, featured[i].stage]))} action={{ move: ANO[index].move as AnoMove, key: index }} className={STAGE} />
            {SLIDES.map((s, i) => (
              <div key={s.id} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${SLIDES.length}`} aria-hidden={i !== index} hidden={i !== index} className="contents">
                <HeroHeadline dark left={landing.slides[i].left} right={landing.slides[i].right} sizeClassName={HEADLINE} gap={<span className="block w-[6vw]" />} />
                <div className="order-3">
                  <HeroCards slideKey={s.id} data={featured[i]} chipClassName={LOOK[s.id].chip} action={<Button className="w-full" href={s.href}>{landing.tryIt}</Button>} />
                </div>
              </div>
            ))}
          </div>
          <LowerBand
            tint={look.lab}
            text={landing.lowerBand}
            explore={landing.lowerBand.explore.replace("{count}", String(count))}
            controls={
              <div className="flex items-center gap-3">
                <CarouselControls count={SLIDES.length} index={index} onSelect={go} label="Featured experiment" />
                <IconButton label={paused ? "Play the slides" : "Pause the slides"} onClick={() => setPaused(!paused)}>
                  {paused ? <IconPlay /> : <IconPause />}
                </IconButton>
              </div>
            }
          />
        </section>
      </Frame>
    </div>
  );
}
