"use client";

import { useEffect, useRef } from "react";
import type { AnoState } from "@/lib/store";
import { TOKENS } from "@/lib/tokens";

/*
 * Ano in the lab HUD (CLAUDE.md §8 step 5: Ano 2D first): a small glass orb
 * with one glowing eye that follows the cursor. Mood sets the eye colour:
 * red glitch on a wrong run, gold on a correct one, lilac otherwise.
 */

const EYE: Record<AnoState, string> = {
  greet: TOKENS.lilac,
  building: TOKENS.lilac,
  stuck: TOKENS.lilac,
  correct: TOKENS.resolve,
  levelUp: TOKENS.resolve,
  wrong: TOKENS.anomaly,
};

export function AnoOrb({ mood, size = 64 }: { mood: AnoState; size?: number }) {
  const eye = useRef<SVGGElement>(null);
  const root = useRef<SVGSVGElement>(null);

  // The eye follows the pointer (direct style writes, no React state).
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = root.current;
      const pupil = eye.current;
      if (!el || !pupil) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, len / 300) * 7;
      pupil.setAttribute("transform", `translate(${(dx / len) * reach} ${(dy / len) * reach})`);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const eyeColor = EYE[mood];
  return (
    <svg ref={root} viewBox="-50 -50 100 100" width={size} height={size} aria-hidden className="shrink-0 overflow-visible">
      <defs>
        <radialGradient id="ano-shell" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="rgba(237,235,255,0.85)" />
          <stop offset="25%" stopColor="rgba(237,235,255,0.18)" />
          <stop offset="70%" stopColor="rgba(184,166,255,0.08)" />
          <stop offset="100%" stopColor="rgba(184,166,255,0.35)" />
        </radialGradient>
        <radialGradient id="ano-glow">
          <stop offset="0%" stopColor={eyeColor} stopOpacity="0.55" />
          <stop offset="100%" stopColor={eyeColor} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r={48} fill="url(#ano-glow)" />
      <circle r={34} fill={TOKENS.void} />
      <circle r={34} fill="url(#ano-shell)" stroke="rgba(237,235,255,0.35)" strokeWidth={1} />
      <ellipse cx={0} cy={0} rx={44} ry={12} fill="none" stroke={eyeColor} strokeOpacity={0.55} strokeWidth={1.2} transform="rotate(-14)" className={mood === "correct" || mood === "levelUp" ? "motor-spin" : undefined} />
      <g ref={eye} style={{ transition: "transform 120ms ease-out" }}>
        <rect x={-11} y={-4} width={22} height={8} rx={4} fill={eyeColor} className={mood === "wrong" ? "ano-glitch" : "ano-blink"} style={{ filter: `drop-shadow(0 0 4px ${eyeColor})` }} />
      </g>
    </svg>
  );
}
