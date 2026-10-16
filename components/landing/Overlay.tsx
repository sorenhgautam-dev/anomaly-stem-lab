"use client";

import { useEffect, useRef, useState, ViewTransition } from "react";
import { Gauge, Volume2, VolumeX } from "lucide-react";
import anoLines from "@/content/ano-lines.json";
import landing from "@/content/landing.json";
import { cn } from "@/lib/cn";
import { useQuality } from "@/lib/quality";
import { setMuted } from "@/lib/sound";
import { useLanding, type Guess } from "./landing-store";
import { CHAPTER_STOPS } from "./layout";
import { live, onProgress } from "./live";
import { MagneticButton } from "./MagneticButton";

/*
 * Everything in the DOM on top of the WebGL scene. Lusion-style restraint:
 * a quiet header with a one-line descriptor, regular-weight headlines that
 * slide up out of a mask as you scroll (scrubbed, transform-only so it stays
 * smooth), tiny uppercase labels, a "+" grid row along the bottom.
 */

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

/**
 * Masked reveal driven by scroll. d is −1 before the section, 0 on it, +1
 * after. The text sits below its mask before, in place on it, above after.
 * Written straight to element styles from the scroll listener, so scrolling
 * never re-renders React (CLAUDE.md §9). Start hidden lines with a transform
 * class, not translate-y-*: Tailwind v4 puts that on the separate `translate`
 * property, which adds to this transform instead of being replaced by it.
 */
function applyReveal(d: number, line: HTMLElement | null, body: HTMLElement | null) {
  const c = Math.max(-1, Math.min(1, d));
  const eased = Math.sign(c) * Math.pow(Math.abs(c), 1.6);
  const visible = 1 - Math.pow(Math.abs(c), 1.4);
  // 130%: clears the descender padding inside the mask, superscripts included.
  if (line) line.style.transform = `translate3d(0, ${-eased * 130}%, 0)`;
  if (body) {
    body.style.opacity = String(visible);
    body.style.transform = `translate3d(0, ${-c * 14}px, 0)`;
    body.style.visibility = visible < 0.01 ? "hidden" : "visible";
  }
}

export function Overlay() {
  return (
    <>
      <Header />
      <HeroPanel />
      <Chapters />
      <BottomRow />
      <ScrollBar />
      <AnoBubble />
      <AnomalyFlash />
      <Caption />
    </>
  );
}

function IconButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onPointerEnter={() => (live.lensHover = true)}
      onPointerLeave={() => (live.lensHover = false)}
      className="glass pointer-events-auto grid size-11 place-items-center rounded-full text-pearl/80 transition-colors duration-300 ease-lab hover:bg-pearl hover:text-void"
    >
      {children}
    </button>
  );
}

function Header() {
  const pastHero = useLanding((s) => s.pastHero);
  const soundOn = useLanding((s) => s.soundOn);
  const toggleSound = useLanding((s) => s.toggleSound);
  const quality = useQuality((s) => s.level);
  const setQuality = useQuality((s) => s.setLevel);

  useEffect(() => setMuted(!soundOn), [soundOn]);

  return (
    // The gradient dims anything drifting behind the wordmark, so it always reads.
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-8 bg-linear-to-b from-void/80 via-void/40 to-transparent px-5 pb-12 pt-5 sm:px-10 sm:pt-7">
      <div className="flex items-start gap-16">
        <ViewTransition name="wordmark">
          <span className="pt-2.5 text-[17px] font-medium tracking-[0.22em]">ANOMALY</span>
        </ViewTransition>
        {/* An intro line: it bows out once the chapters start, so it never sits over the scene. */}
        <p
          className={cn(
            "hidden max-w-[22rem] text-[17px] leading-[1.3] tracking-[-0.01em] text-pearl/85 transition-opacity duration-500 ease-lab lg:block",
            pastHero && "opacity-0",
          )}
        >
          {landing.descriptor}
        </p>
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        <IconButton
          label={`Graphics: ${quality}. Switch to ${quality === "high" ? "low" : "high"}`}
          onClick={() => setQuality(quality === "high" ? "low" : "high")}
        >
          <Gauge className="size-[18px]" aria-hidden strokeWidth={1.6} />
        </IconButton>
        <IconButton label={soundOn ? "Mute sound" : "Turn sound on"} onClick={toggleSound} pressed={!soundOn}>
          {soundOn ? (
            <Volume2 className="size-[18px]" aria-hidden strokeWidth={1.6} />
          ) : (
            <VolumeX className="size-[18px]" aria-hidden strokeWidth={1.6} />
          )}
        </IconButton>
        <MagneticButton href="/start" variant="solid" size="label" dot className="hidden sm:inline-flex">
          {landing.cta}
        </MagneticButton>
      </div>
    </header>
  );
}

function HeroPanel() {
  const atHero = useLanding((s) => s.atHero);
  const phase = useLanding((s) => s.heroPhase);
  const guess = useLanding((s) => s.guess);
  const makeGuess = useLanding((s) => s.makeGuess);
  const resetHero = useLanding((s) => s.resetHero);
  const line = useRef<HTMLSpanElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const hero = landing.hero;

  useEffect(
    () => onProgress((p) => applyReveal(clamp01(p / 0.075), line.current, body.current)),
    [],
  );

  return (
    <section
      aria-labelledby="hero-question"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-[radial-gradient(ellipse_55%_60%_at_12%_88%,rgba(5,6,10,0.55),transparent_70%)] px-5 pb-20 pt-24 sm:px-10 sm:pb-24"
    >
      <div className="max-w-3xl">
        <h1 id="hero-question" className="type-headline text-[clamp(3.4rem,8.4vw,8.75rem)]">
          <span className="block overflow-hidden pb-[0.08em]">
            <span ref={line} className="block will-change-transform">
              {hero.question} <span className="type-accent">{hero.questionAccent}</span>
            </span>
          </span>
        </h1>
        <div ref={body}>
          <p className="mt-6 max-w-md text-[17px] leading-[1.45] text-pearl/72">{hero.setup}</p>
          <div className={cn("mt-8 flex flex-wrap items-center gap-2.5", atHero && "pointer-events-auto")}>
            {phase === "done" ? (
              <>
                <MagneticButton onClick={resetHero}>{hero.retry}</MagneticButton>
                <span className="type-label flex items-center gap-3 pl-3 text-pearl/55">
                  <span className="relative h-8 w-px overflow-hidden bg-pearl/15">
                    <span className="absolute inset-x-0 top-0 h-3 animate-[scroll-cue_1.6s_ease-in-out_infinite] bg-lilac" />
                  </span>
                  {hero.scrollHint}
                </span>
              </>
            ) : (
              hero.options.map((option) => (
                <MagneticButton
                  key={option.id}
                  onClick={() => makeGuess(option.id as Guess)}
                  selected={guess === option.id}
                  disabled={phase !== "ask"}
                >
                  {option.label}
                </MagneticButton>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Chapters() {
  const chapter = useLanding((s) => s.chapter);
  const scrim = useRef<HTMLDivElement>(null);
  const lines = useRef<(HTMLSpanElement | null)[]>([]);
  const bodies = useRef<(HTMLDivElement | null)[]>([]);
  const lastIndex = landing.chapters.length - 1;

  useEffect(
    () =>
      onProgress((p) => {
        if (scrim.current) scrim.current.style.opacity = String(clamp01((p - 0.05) / 0.1));
        CHAPTER_STOPS.forEach((stop, i) => {
          // The last chapter stays put once reached: there's nothing after it.
          const d = i === lastIndex ? Math.min(0, (p - stop) / 0.09) : (p - stop) / 0.09;
          applyReveal(d, lines.current[i], bodies.current[i]);
        });
      }),
    [lastIndex],
  );

  return (
    <>
      <div
        ref={scrim}
        aria-hidden
        className="pointer-events-none fixed inset-y-0 left-0 z-10 w-full bg-[radial-gradient(ellipse_60%_70%_at_10%_55%,rgba(5,6,10,0.7),rgba(5,6,10,0.3)_45%,transparent_75%)] opacity-0 sm:w-[70%]"
      />
      {landing.chapters.map((c, i) => {
        const last = i === lastIndex;
        return (
          <section
            key={c.id}
            aria-labelledby={`chapter-${c.id}`}
            className={cn(
              "pointer-events-none fixed inset-x-0 z-20 px-5 sm:px-10",
              last ? "bottom-24 sm:bottom-28" : "bottom-24 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2",
            )}
          >
            <div className="max-w-xl">
              <h2 id={`chapter-${c.id}`} className="type-headline text-[clamp(3.75rem,9.5vw,9.5rem)]">
                <span className="block overflow-hidden pb-[0.08em]">
                  <span
                    ref={(el) => {
                      lines.current[i] = el;
                    }}
                    className="block transform-[translate3d(0,130%,0)] will-change-transform"
                  >
                    {c.title}
                    <sup className="ml-3 align-top font-mono text-[0.14em] tracking-normal text-lilac">0{i + 1}</sup>
                  </span>
                </span>
              </h2>
              <div
                ref={(el) => {
                  bodies.current[i] = el;
                }}
                className="invisible opacity-0"
              >
                <p className="mt-5 max-w-md text-[17px] leading-[1.45] text-pearl/75">{c.body}</p>
                {last && (
                  <div className={cn("mt-8", chapter === lastIndex && "pointer-events-auto")}>
                    <MagneticButton href="/start" variant="solid" dot>
                      {landing.cta}
                    </MagneticButton>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}

/** Lusion-style grid row: "+" marks, the scroll cue, then chapter links. */
function BottomRow() {
  const active = useLanding((s) => s.chapter);
  const pastHero = useLanding((s) => s.pastHero);
  const cue = useRef<HTMLSpanElement>(null);
  const links = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      onProgress((p) => {
        const inChapters = clamp01((p - 0.05) / 0.06);
        if (cue.current) cue.current.style.opacity = String(1 - inChapters);
        if (links.current) {
          links.current.style.opacity = String(inChapters);
          links.current.style.visibility = inChapters < 0.01 ? "hidden" : "visible";
        }
      }),
    [],
  );

  return (
    <nav
      aria-label="Chapters"
      className="pointer-events-none fixed inset-x-5 bottom-5 z-20 sm:inset-x-10 sm:bottom-7"
    >
      <div className="relative flex h-6 items-center justify-between text-pearl/45">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} aria-hidden className="text-[15px] font-light leading-none">
            +
          </span>
        ))}
        <span ref={cue} className="type-label absolute left-1/2 -translate-x-1/2 text-pearl/60">
          {landing.scroll}
        </span>
        <div ref={links} className="invisible absolute inset-0 hidden opacity-0 sm:block">
          {landing.chapters.map((chapter, i) => (
            <button
              key={chapter.id}
              type="button"
              tabIndex={pastHero ? 0 : -1}
              onClick={() => live.scrollTo(CHAPTER_STOPS[i])}
              onPointerEnter={() => (live.lensHover = true)}
              onPointerLeave={() => (live.lensHover = false)}
              aria-current={i === active ? "step" : undefined}
              style={{ left: `${12.5 + i * 25}%` }}
              className={cn(
                "type-label pointer-events-auto absolute top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-2 transition-colors duration-300 ease-lab",
                i === active ? "text-pearl" : "text-pearl/40 hover:text-pearl/80",
              )}
            >
              {i === active && <span aria-hidden className="mr-2 inline-block size-1.5 rounded-full bg-signal align-middle" />}
              {chapter.title}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

/** A thin scroll indicator on the right edge. */
function ScrollBar() {
  const thumb = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      onProgress((p) => {
        if (thumb.current) thumb.current.style.transform = `translate3d(0, ${p * (128 - 32)}px, 0)`;
      }),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed right-3 top-1/2 z-20 hidden h-32 w-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-pearl/10 sm:block">
      <div ref={thumb} className="absolute inset-x-0 top-0 h-8 rounded-full bg-pearl/70" />
    </div>
  );
}

function AnoBubble() {
  const result = useLanding((s) => s.heroResult);
  const anoReady = useLanding((s) => s.anoReady);
  const atHero = useLanding((s) => s.atHero);
  const shown = result !== null && anoReady && atHero;
  const line = result ? `${anoLines.hero[result]} ${anoLines.hero.next}` : "";

  return (
    <aside
      aria-live="polite"
      className={cn(
        "glass pointer-events-none fixed left-5 right-5 top-24 z-20 rounded-[20px] p-5 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.25,1.4,0.4,1)] sm:left-auto sm:right-[7%] sm:top-[17%] sm:w-[22rem]",
        shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0",
      )}
    >
      <p className="type-label flex items-center gap-2 text-lilac">
        <span className="size-1.5 rounded-full bg-lilac shadow-[0_0_12px_2px_rgba(184,166,255,0.8)]" />
        Ano
      </p>
      <p className="mt-3 text-[17px] leading-[1.4] tracking-[-0.01em] text-pearl">{line}</p>
    </aside>
  );
}

function AnomalyFlash() {
  const flashId = useLanding((s) => s.flashId);
  const [visibleId, setVisibleId] = useState(0);

  useEffect(() => {
    if (flashId === 0) return;
    const show = window.setTimeout(() => setVisibleId(flashId), 0);
    const hide = window.setTimeout(() => setVisibleId(0), 1400);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [flashId]);

  if (visibleId === 0) return null;
  return (
    <div
      key={visibleId}
      role="status"
      className="anomaly-flash pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-void/60 backdrop-blur-[2px]"
    >
      <div className="anomaly-scanlines absolute inset-0" />
      <p
        className="anomaly-glitch type-headline text-[clamp(3rem,9vw,9rem)] font-medium text-anomaly"
        data-text="ANOMALY DETECTED"
      >
        ANOMALY DETECTED
      </p>
    </div>
  );
}

function Caption() {
  const caption = useLanding((s) => s.caption);
  const [visible, setVisible] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    if (!caption) return;
    const show = window.setTimeout(() => setVisible(caption), 0);
    const hide = window.setTimeout(() => setVisible(null), 2600);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [caption]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-14 z-30 flex justify-center sm:bottom-16">
      {visible && (
        <span key={visible.id} className="type-label rounded-full bg-void/70 px-3.5 py-2 text-pearl/70">
          [{visible.text}]
        </span>
      )}
    </div>
  );
}
