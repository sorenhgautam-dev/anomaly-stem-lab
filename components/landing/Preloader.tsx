"use client";

import { useEffect, useRef, useState } from "react";
import { TOKENS } from "@/lib/tokens";
import { useLanding } from "./landing-store";

/*
 * Preloader (CLAUDE.md §3.1.10): a percentage counter while particles
 * assemble into the ANOMALY wordmark, then the particles burst and the scene
 * shows through. Drawn on a 2D canvas so it runs while WebGL shaders compile.
 * The counter holds at 90 until the scene reports it's ready.
 */

const MIN_MS = 1500;
const BURST_MS = 750;

interface Particle {
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  delay: number;
  size: number;
  lilac: boolean;
}

async function sampleWordmark(width: number, height: number): Promise<{ x: number; y: number }[]> {
  // next/font gives the family a generated name; read it from the CSS variable.
  const family =
    getComputedStyle(document.documentElement).getPropertyValue("--font-host-grotesk").trim() ||
    "ui-sans-serif, system-ui, sans-serif";
  try {
    await Promise.race([
      document.fonts.load(`500 120px ${family}`),
      new Promise((resolve) => setTimeout(resolve, 900)),
    ]);
  } catch {
    // Fall back to the system font.
  }
  const fontSize = Math.min(width * 0.15, 190);
  const off = document.createElement("canvas");
  off.width = Math.ceil(width);
  off.height = Math.ceil(fontSize * 1.4);
  const ctx = off.getContext("2d");
  if (!ctx) return [];
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${fontSize}px ${family}`;
  ctx.fillText("ANOMALY", off.width / 2, off.height / 2);
  const data = ctx.getImageData(0, 0, off.width, off.height).data;
  const step = Math.max(3, Math.round(fontSize / 34));
  const points: { x: number; y: number }[] = [];
  const top = height / 2 - off.height / 2;
  for (let y = 0; y < off.height; y += step) {
    for (let x = 0; x < off.width; x += step) {
      if (data[(y * off.width + x) * 4 + 3] > 128) points.push({ x, y: y + top });
    }
  }
  return points;
}

export function Preloader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let raf = 0;
    let particles: Particle[] = [];
    let shown = 0;
    let burstAt = 0;
    let finished = false;
    const start = performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    void sampleWordmark(width, height).then((points) => {
      particles = points.map((p) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.max(width, height) * (0.45 + Math.random() * 0.4);
        return {
          x: 0,
          y: 0,
          sx: width / 2 + Math.cos(angle) * dist,
          sy: height / 2 + Math.sin(angle) * dist,
          tx: p.x,
          ty: p.y,
          vx: 0,
          vy: 0,
          delay: Math.random() * 0.35,
          size: 1 + Math.random() * 1.6,
          lilac: Math.random() < 0.25,
        };
      });
    });

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const frame = (now: number) => {
      const elapsed = now - start;
      const ready = useLanding.getState().sceneReady;
      const cap = ready ? 1 : 0.9;
      const goal = Math.min(cap, elapsed / MIN_MS);
      shown += (goal - shown) * 0.12;
      if (ready && goal >= 1 && shown > 0.995) shown = 1;
      if (counterRef.current) counterRef.current.textContent = String(Math.round(shown * 100));

      ctx.clearRect(0, 0, width, height);
      if (shown === 1 && !burstAt) {
        burstAt = now;
        for (const p of particles) {
          const dx = p.x - width / 2;
          const dy = p.y - height / 2;
          const len = Math.hypot(dx, dy) || 1;
          const speed = 6 + Math.random() * 14;
          p.vx = (dx / len) * speed + (Math.random() - 0.5) * 4;
          p.vy = (dy / len) * speed + (Math.random() - 0.5) * 4;
        }
        setFading(true);
      }

      const burst = burstAt ? Math.min(1, (now - burstAt) / BURST_MS) : 0;
      for (const p of particles) {
        if (burstAt) {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.96;
          p.vy *= 0.96;
        } else {
          const k = ease(Math.min(1, Math.max(0, (shown * 1.25 - p.delay) / 0.85)));
          p.x = p.sx + (p.tx - p.sx) * k;
          p.y = p.sy + (p.ty - p.sy) * k;
        }
        ctx.globalAlpha = (1 - burst) * 0.9;
        ctx.fillStyle = p.lilac ? TOKENS.lilac : TOKENS.pearl;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }

      if (burst >= 1 && !finished) {
        finished = true;
        useLanding.getState().setIntroDone();
        setGone(true);
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // No particles: count up, then fade.
      const tick = () => {
        const ready = useLanding.getState().sceneReady;
        if (counterRef.current) counterRef.current.textContent = ready ? "100" : "90";
        if (ready) {
          setFading(true);
          window.setTimeout(() => {
            useLanding.getState().setIntroDone();
            setGone(true);
          }, 400);
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else {
      raf = requestAnimationFrame(frame);
    }
    return () => cancelAnimationFrame(raf);
  }, []);

  if (gone) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-void transition-[background-color] duration-700 ease-lab"
      style={{ backgroundColor: fading ? "transparent" : undefined }}
      aria-busy={!fading}
      aria-label="Loading the lab"
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      <div
        className="type-headline absolute bottom-6 left-5 flex items-baseline gap-1 text-7xl tabular-nums text-pearl transition-opacity duration-300 sm:bottom-10 sm:left-10 sm:text-[9rem]"
        style={{ opacity: fading ? 0 : 1 }}
      >
        <span ref={counterRef}>0</span>
        <span className="type-accent text-4xl text-lilac sm:text-6xl">%</span>
      </div>
    </div>
  );
}
