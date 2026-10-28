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
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { StageCard, type StageTone } from "@/components/ui/StageCard";
import { LAB } from "@/lib/tokens";
import { DropControls, labelFor, verdictFor } from "./DropControls";
import { realAnswer } from "./drop-sim";
import { useDrop } from "./drop-store";
import { DropView } from "./DropView";
import { HeroCards, type HeroCardData } from "./HeroCards";
import { HeroHeadline } from "./HeroHeadline";
import { HeroStage } from "./HeroStage";
import { LowerBand } from "./LowerBand";
import { useCarousel } from "./useCarousel";
import { useHeroScene } from "./useHeroScene";
import { useDropRun } from "./useDropRun";

/*
 * The landing hero (DESIGN.md §7.1, patterns P1–P7): a carousel of three
 * featured anomalies, each in its lab's palette. The stage card holds the
 * slide's real experiment in 3D with Ano behind it (HeroStage), its readout
 * the same value as the cards, which the simulator fills (`featured`,
 * computed on the server by featured.ts). Changing slide cross-fades the
 * stage, the floating specimens, the ribbon and a faint tint of the page to
 * the next palette; orange stays on Ano. "Try it" turns the hero into the
 * "Which falls faster?" experiment in place. The headline sits above the
 * site canvas (z-15) so the specimens pass behind its letters; where it
 * crosses a dark stage card its letters turn white (HeroHeadline).
 */

/** Each slide's lab palette: the specimens' two colours, the page's tint, the ribbon, the chip and the How it works tile. */
const LOOK: Record<StageTone, { specimens: SpecimenPalette; tint: string; ribbon: string; chip: string; lab: "chem" | "robo" }> = {
  gravity: {
    specimens: { a: LAB.chemistry.gold, b: LAB.chemistry.wall },
    tint: "bg-chem-bench/25",
    ribbon: "[--ribbon-1:color-mix(in_oklab,var(--color-chem-bench)_45%,white)] [--ribbon-2:var(--color-chem-bench)] [--ribbon-3:var(--color-chem-gold)]",
    chip: "bg-chem-wall text-white",
    lab: "chem",
  },
  led: {
    specimens: { a: LAB.robotics.gold, b: LAB.robotics.teal },
    tint: "bg-robo-wall/[0.05]",
    ribbon: "[--ribbon-1:var(--color-robo-stage-2)] [--ribbon-2:var(--color-robo-wall)] [--ribbon-3:var(--color-robo-stage)]",
    chip: "bg-robo-gold text-ink-900",
    lab: "robo",
  },
  bag: {
    specimens: { a: LAB.chemistry.gold, b: LAB.chemistry.sage },
    tint: "bg-chem-wall/[0.06]",
    ribbon: "[--ribbon-1:color-mix(in_oklab,var(--color-chem-wall)_40%,white)] [--ribbon-2:var(--color-chem-wall)] [--ribbon-3:var(--color-chem-floor)]",
    chip: "bg-chem-gold text-ink-900",
    lab: "chem",
  },
};

const SLIDES = landing.slides;
const H = landing.hero;
/**
 * Where the drop teaser stands. Desktop follows the reference image: on the
 * stage card right under the headline. Phones: under the headline.
 */
const SPOT = "relative order-2 mx-auto mt-2 h-[19rem] w-[15rem] md:absolute md:bottom-[2%] md:left-1/2 md:top-[clamp(5.4rem,9.4vw,8.6rem)] md:mt-0 md:h-auto md:-translate-x-1/2";
/** The stage: the stage card's own box on desktop (Ano's head reaches into the headline's gap); a card of its own under the headline on phones. */
const STAGE = "relative order-2 mx-auto mt-4 h-[24rem] w-full max-w-[26rem] md:absolute md:bottom-[3%] md:left-1/2 md:top-[clamp(4.4rem,8vw,7.4rem)] md:mt-0 md:h-auto md:w-[min(31rem,36%)] md:max-w-none md:-translate-x-1/2";
/** The hero headline: DESIGN.md §4's clamp(4rem, 13vw, 11rem) on desktop. */
const HEADLINE = "text-[clamp(4.5rem,24vw,7.5rem)] md:text-[clamp(4rem,12.4vw,11rem)]";

export function Hero({ count, featured }: { count: number; featured: HeroCardData[] }) {
  const phase = useDrop((s) => s.phase);
  const guess = useDrop((s) => s.guess);
  const open = useDrop((s) => s.open);
  const experiment = phase !== "off";
  const { index, go, paused, setPaused, bind } = useCarousel(SLIDES.length, { disabled: experiment });
  const view = useRef<HTMLDivElement>(null);
  const headline = useRef<HTMLDivElement>(null);
  useDropRun(view, headline);

  const verdict = phase === "result" ? verdictFor(guess) : null;
  const words = verdict === "correct" ? { left: "Nailed", right: "it.", tone: "win" as const } : verdict === "wrong" ? { left: "Anomaly", right: "detected.", tone: "glitch" as const } : { left: H.left, right: H.right, tone: "ink" as const };
  const dropCard: HeroCardData = {
    result: { title: H.result.title, prediction: labelFor(guess), reality: phase === "result" ? labelFor(realAnswer()) : "Not dropped yet", status: verdict ? (verdict === "correct" ? "verified" : "anomaly") : null },
    // The belief card follows the visitor's own drop: untested until the balls land, then the guess's belief and its verdict.
    belief: verdict && guess
      ? { ...H.beliefs[guess], tone: verdict === "correct" ? "verified" : "anomaly", status: verdict === "correct" ? "True!" : "Not true!" }
      : { ...H.beliefs.before, tone: "untested", status: "Not tested yet" },
    href: null,
  };

  const frame = useRef<HTMLDivElement>(null);
  useHeroScene(frame);
  const tone: StageTone = experiment ? "gravity" : (SLIDES[index].id as StageTone);
  const look = LOOK[tone];
  return (
    // Scrolling the hero away plays its scroll scene (useHeroScene).
    <div ref={frame}>
      <Frame className={cn(look.ribbon, "[transition:--ribbon-1_700ms,--ribbon-2_700ms,--ribbon-3_700ms]")}>
        {/* A faint tint of the slide's palette over the paper, under the 3D. */}
        <div aria-hidden className={cn("pointer-events-none absolute inset-0 transition-colors duration-700 ease-out-soft", look.tint)} />
        <ShapesField layout="hero" palette={look.specimens} />
        <SiteHeader />
        <section aria-roledescription="carousel" aria-label="Featured anomalies" className="relative flex flex-1 flex-col" {...bind}>
          <div className="relative flex flex-1 flex-col px-4 pt-6 sm:px-8 md:min-h-[34rem] md:pt-7">
            <StageCard tone={tone} className="bottom-[3%] left-1/2 top-[clamp(4.4rem,8vw,7.4rem)] hidden w-[min(31rem,36%)] -translate-x-1/2 md:block" />
            {experiment ? (
              <DropView className={cn(SPOT, "md:w-[min(44rem,48%)]")} />
            ) : (
              <HeroStage tone={tone} values={Object.fromEntries(SLIDES.map((s, i) => [s.id, featured[i].stage]))} action={{ move: SLIDES[index].ano.move as AnoMove, key: index }} className={STAGE} />
            )}
            {SLIDES.map((s, i) => (
              <div key={s.id} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${SLIDES.length}`} aria-hidden={i !== index || experiment} hidden={i !== index || experiment} className="contents">
                <HeroHeadline dark={s.id !== "gravity"} left={s.left} right={s.right} sizeClassName={HEADLINE} gap={<span className="block w-[6vw]" />} />
                <div className="order-3">
                  <HeroCards slideKey={s.id} data={featured[i]} chipClassName={LOOK[s.id as StageTone].chip} action={s.id === "gravity" ? <Button className="w-full" onClick={open}>{landing.tryIt}</Button> : undefined} />
                </div>
              </div>
            ))}
            {experiment && (
              <div ref={headline} className={cn("contents", verdict === "wrong" && "[&_h1]:animate-glitch motion-reduce:[&_h1]:animate-none")}>
                <SplitHeadline className="relative z-15 order-1" rollKey={`${phase}-${verdict}`} tone={words.tone} left={words.left} right={words.right} sizeClassName="text-[clamp(3.4rem,15vw,6rem)] md:text-[clamp(3rem,6.2vw,6.6rem)]" gap={<span className="block w-[24vw]" />} />
                <div className="order-3">
                  <HeroCards slideKey={`drop-${verdict}`} data={dropCard} />
                </div>
              </div>
            )}
          </div>
          {experiment ? (
            <DropControls />
          ) : (
            <LowerBand
              tint={look.lab}
              text={landing.lowerBand}
              explore={landing.lowerBand.explore.replace("{count}", String(count))}
              controls={
                <div className="flex items-center gap-3">
                  <CarouselControls count={SLIDES.length} index={index} onSelect={go} label="Featured anomaly" />
                  <IconButton label={paused ? "Play the slides" : "Pause the slides"} onClick={() => setPaused(!paused)}>
                    {paused ? <IconPlay /> : <IconPause />}
                  </IconButton>
                </div>
              }
            />
          )}
        </section>
      </Frame>
    </div>
  );
}
