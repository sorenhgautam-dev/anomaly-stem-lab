"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { detectInitialQuality, useQuality } from "@/lib/quality";
import { unlockAudio } from "@/lib/sound";
import { useLanding } from "./landing-store";
import { live, publishProgress } from "./live";
import { Overlay } from "./Overlay";
import { Preloader } from "./Preloader";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

/** Height of the scroll track. Scroll only drives the camera, not the page. */
const TRACK = "h-[600vh]";

export function Landing() {
  const root = useRef<HTMLDivElement>(null);

  // Reduced motion and a first guess at quality.
  useEffect(() => {
    const initial = detectInitialQuality();
    useQuality.getState().setLevel(initial.level, initial.locked);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      live.reducedMotion = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Audio may only start inside a user gesture.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Scroll progress: Lenis for weighted smooth scroll, native with reduced
  // motion. Lenis has no rAF of its own: the R3F frame loop drives it
  // (LenisDriver in Scene), so there is one animation loop (CLAUDE.md §9).
  useEffect(() => {
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const report = (p: number) => {
      publishProgress(p);
      useLanding.getState().syncScroll(p);
    };

    if (live.reducedMotion) {
      const max = () => document.documentElement.scrollHeight - window.innerHeight;
      const onScroll = () => report(max() > 0 ? window.scrollY / max() : 0);
      window.addEventListener("scroll", onScroll, { passive: true });
      live.scrollTo = (p) => window.scrollTo({ top: p * max() });
      return () => window.removeEventListener("scroll", onScroll);
    }

    const lenis = new Lenis({ autoRaf: false, lerp: 0.085, wheelMultiplier: 0.9 });
    live.lenis = lenis;
    lenis.on("scroll", (l: Lenis) => report(l.progress));
    live.scrollTo = (p) => lenis.scrollTo(p * lenis.limit, { duration: 2.2 });
    if (!useLanding.getState().introDone) lenis.stop();
    const unsubscribe = useLanding.subscribe((s) => {
      if (s.introDone) lenis.start();
    });
    return () => {
      unsubscribe();
      live.lenis = null;
      lenis.destroy();
    };
  }, []);

  return (
    <div
      ref={root}
      className="relative w-full"
    >
      <div className="fixed inset-0" aria-hidden>
        <Scene eventSource={root} />
      </div>
      <Overlay />
      <div aria-hidden className={TRACK} />
      <Preloader />
    </div>
  );
}
