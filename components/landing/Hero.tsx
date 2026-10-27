"use client";

import { useRef } from "react";
import { Pause, Play } from "lucide-react";
import landing from "@/content/landing.json";
import { cn } from "@/lib/cn";
import { AnoView } from "@/components/ano/AnoView";
import type { AnoExpression, AnoMove } from "@/components/ano/types";
import { Button } from "@/components/ui/Button";
import { CarouselControls } from "@/components/ui/CarouselControls";
import { Frame } from "@/components/ui/Frame";
import { IconButton } from "@/components/ui/IconButton";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { StageCard } from "@/components/ui/StageCard";
import { DropControls, labelFor, verdictFor } from "./DropControls";
import { useDrop } from "./drop-store";
import { DropView } from "./DropView";
import { HeroCards, type HeroCardData } from "./HeroCards";
import { LowerBand } from "./LowerBand";
import { useCarousel } from "./useCarousel";
import { useDropRun } from "./useDropRun";

/*
 * The landing hero (DESIGN.md §7.1, patterns P1–P7): a carousel of three
 * featured anomalies with Ano in the headline gap, and "Try it", which turns
 * the hero into the "Which falls faster?" experiment in place.
 */

const SLIDES = landing.slides;
const H = landing.hero;
/** Where Ano (or the drop) stands: in the headline gap on desktop, under the headline on phones. */
const SPOT = "relative order-2 mx-auto mt-2 h-[19rem] w-[15rem] md:absolute md:left-1/2 md:top-1/2 md:mt-0 md:-translate-x-1/2 md:-translate-y-1/2";

export function Hero({ count }: { count: number }) {
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
    result: { title: H.result.title, prediction: labelFor(guess), reality: phase === "result" ? H.result.reality : "Not dropped yet", status: verdict ? (verdict === "correct" ? "verified" : "anomaly") : null },
    belief: SLIDES[0].belief as HeroCardData["belief"],
    href: null,
  };

  return (
    <Frame>
      <SiteHeader />
      <section aria-roledescription="carousel" aria-label="Featured anomalies" className="relative flex flex-1 flex-col" {...bind}>
        <div className="relative flex flex-1 flex-col justify-center px-4 pt-6 sm:px-8 md:min-h-[32rem] md:pt-0">
          <StageCard className="left-1/2 top-1/2 hidden h-[86%] w-[24%] -translate-x-1/2 -translate-y-1/2 md:block" />
          {experiment ? (
            <DropView className={cn(SPOT, "md:h-[min(70vh,36rem)] md:w-[40vw]")} />
          ) : (
            <AnoView className={cn(SPOT, "md:h-[min(68vh,35rem)] md:w-[22rem]")} expression={SLIDES[index].ano.expression as AnoExpression} action={{ move: SLIDES[index].ano.move as AnoMove, key: index }} label="Ano, the lab partner, waving" />
          )}
          {SLIDES.map((s, i) => (
            <div key={s.id} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${SLIDES.length}`} aria-hidden={i !== index || experiment} hidden={i !== index || experiment} className="contents">
              <SplitHeadline className="order-1" left={s.left} right={s.right} gap={<span className="block w-[17vw]" />} />
              <div className="order-3">
                <HeroCards slideKey={s.id} data={s as HeroCardData} action={s.id === "gravity" ? <Button className="w-full" onClick={open}>{landing.tryIt}</Button> : undefined} />
              </div>
            </div>
          ))}
          {experiment && (
            <div ref={headline} className={cn("contents", verdict === "wrong" && "[&_h1]:animate-glitch motion-reduce:[&_h1]:animate-none")}>
              <SplitHeadline className="order-1" rollKey={`${phase}-${verdict}`} tone={words.tone} left={words.left} right={words.right} sizeClassName="text-[clamp(3.4rem,15vw,6rem)] md:text-[clamp(3.25rem,7vw,7.25rem)]" gap={<span className="block w-[38vw]" />} />
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
            text={landing.lowerBand}
            explore={landing.lowerBand.explore.replace("{count}", String(count))}
            controls={
              <div className="flex items-center gap-3">
                <CarouselControls count={SLIDES.length} index={index} onSelect={go} label="Featured anomaly" />
                <IconButton label={paused ? "Play the slides" : "Pause the slides"} onClick={() => setPaused(!paused)}>
                  {paused ? <Play /> : <Pause />}
                </IconButton>
              </div>
            }
          />
        )}
      </section>
    </Frame>
  );
}
