"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { TOKENS } from "@/lib/tokens";
import { mulberry32 } from "@/components/landing/random";

/*
 * The zoomed-in view (CLAUDE.md §6.5: "the beaker the student sees and the
 * particles inside"). A small canvas in a magnifier ring. Particles keep
 * moving even while the run is paused; the stage sets how they behave:
 *  speed  1 = room temperature        size   1 = normal
 *  count  1 = the starting number     order  1 = locked in a lattice (solid)
 *  escape 0..1 = share drifting out through an open top
 * `species` colours the particles (e.g. water and sugar).
 */

export interface ParticleParams {
  speed: number;
  size: number;
  count: number;
  order: number;
  escape: number;
  /** Share of the particles drawn in the second colour (e.g. dissolved sugar). */
  mix: number;
  /** How evenly the second colour is spread (0 = clumped at the bottom). */
  spread: number;
}

export interface ParticleHandle {
  set: (params: Partial<ParticleParams>) => void;
}

const BASE = 46;

export function ParticleView({
  x,
  y,
  r = 92,
  colors = [TOKENS.signal, TOKENS.pearl],
  label,
  ghost = false,
  ref,
}: {
  x: number;
  y: number;
  r?: number;
  colors?: [string, string];
  label?: string;
  /** Dashed lilac ring: this view shows the student's belief. */
  ghost?: boolean;
  ref?: Ref<ParticleHandle>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const params = useRef<ParticleParams>({ speed: 1, size: 1, count: 1, order: 0, escape: 0, mix: 0, spread: 1 });
  // Colours are read each frame, so a new array from the parent never restarts the view.
  const palette = useRef(colors);
  useEffect(() => {
    palette.current = colors;
  });
  useImperativeHandle(ref, () => ({
    set(p: Partial<ParticleParams>) {
      Object.assign(params.current, p);
    },
  }));

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = r * 2;
    c.width = size * dpr;
    c.height = size * dpr;
    ctx.scale(dpr, dpr);

    const rand = mulberry32(Math.round(x * 13 + y));
    const max = BASE * 3;
    const ps = Array.from({ length: max }, (_, i) => ({
      x: rand() * size,
      y: rand() * size,
      vx: rand() * 2 - 1,
      vy: rand() * 2 - 1,
      // Lattice home: a hexagonal grid filling the bottom of the view.
      hx: r - 60 + ((i % 9) * 15 + (Math.floor(i / 9) % 2) * 7.5),
      hy: r + 50 - Math.floor(i / 9) * 13,
      second: rand(),
      out: 0,
    }));

    let raf = 0;
    let last = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = params.current;
      const n = Math.min(max, Math.round(BASE * p.count));
      const speed = (reduced ? 0.25 : 1) * 90 * p.speed;
      const radius = 4.2 * p.size;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r - 2, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < n; i++) {
        const q = ps[i];
        // Gas/liquid motion, eased toward the lattice home by `order`.
        q.x += q.vx * speed * dt * (1 - p.order);
        q.y += q.vy * speed * dt * (1 - p.order);
        if (p.order > 0) {
          q.x += (q.hx + Math.sin(now / 90 + i) * 1.5 * p.speed - q.x) * p.order * 0.2;
          q.y += (q.hy + Math.cos(now / 80 + i) * 1.5 * p.speed - q.y) * p.order * 0.2;
        }
        const escaping = q.second < p.escape;
        if (escaping) {
          q.out = Math.min(1, q.out + dt * 0.4);
          q.vy = -Math.abs(q.vy) - 0.2;
        }
        if (q.x < radius || q.x > size - radius) q.vx *= -1;
        if (!escaping && (q.y < radius || q.y > size - radius)) q.vy *= -1;
        q.x = Math.min(size - radius, Math.max(radius, q.x));
        if (escaping && q.y < -10) continue;
        q.y = escaping ? q.y : Math.min(size - radius, Math.max(radius, q.y));
        // The second species settles at the bottom until it spreads.
        const isSecond = q.second < p.mix;
        if (isSecond && p.spread < 1) q.y += (size - radius - 6 - q.y) * (1 - p.spread) * 0.08;
        ctx.beginPath();
        ctx.arc(q.x, q.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isSecond ? palette.current[1] : palette.current[0];
        ctx.globalAlpha = escaping ? Math.max(0, 1 - q.out) : 0.9;
        ctx.fill();
      }
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [r, x, y]);

  return (
    <g transform={`translate(${x - r} ${y - r})`}>
      <circle cx={r} cy={r} r={r + 6} fill="rgba(5,6,10,0.85)" stroke={ghost ? TOKENS.lilac : "rgba(237,235,255,0.35)"} strokeWidth={ghost ? 2 : 1.5} strokeDasharray={ghost ? "6 6" : undefined} />
      <foreignObject x={0} y={0} width={r * 2} height={r * 2}>
        <canvas ref={canvas} style={{ width: r * 2, height: r * 2, display: "block" }} />
      </foreignObject>
      {label && (
        <text x={r} y={r * 2 + 28} textAnchor="middle" className={ghost ? "fill-lilac text-[13px]" : "fill-pearl/60 text-[13px]"}>
          {label}
        </text>
      )}
    </g>
  );
}
