"use client";

import { useEffect, useState } from "react";

/*
 * The lab's signature moments (CLAUDE.md §3.5): the ANOMALY DETECTED glitch
 * on a wrong prediction and a gold burst on a correct one. Both respect
 * reduced motion through the global CSS rules.
 */

export function AnomalyMoment({ id }: { id: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (id === 0) return;
    const show = window.setTimeout(() => setShown(id), 0);
    const hide = window.setTimeout(() => setShown(0), 1300);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [id]);
  if (shown === 0) return null;
  return (
    <div key={shown} role="status" className="anomaly-flash pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-void/55 backdrop-blur-[2px]">
      <div className="anomaly-scanlines absolute inset-0" />
      <p className="anomaly-glitch type-headline text-[clamp(2.75rem,8vw,7.5rem)] font-medium text-anomaly" data-text="ANOMALY DETECTED">
        ANOMALY DETECTED
      </p>
    </div>
  );
}

const SPARKS = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2;
  const r = 120 + ((i * 37) % 90);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, d: (i % 5) * 0.04, s: 4 + (i % 3) * 2 };
});

export function GoldMoment({ id }: { id: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (id === 0) return;
    const show = window.setTimeout(() => setShown(id), 0);
    const hide = window.setTimeout(() => setShown(0), 1500);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [id]);
  if (shown === 0) return null;
  return (
    <div key={shown} aria-hidden className="pointer-events-none absolute inset-0 z-30 grid place-items-center overflow-hidden">
      <div className="gold-ring absolute size-40 rounded-full border-2 border-resolve" />
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="gold-spark absolute rounded-full bg-resolve"
          style={{
            width: s.s,
            height: s.s,
            ["--x" as string]: `${s.x}px`,
            ["--y" as string]: `${s.y}px`,
            animationDelay: `${s.d}s`,
            boxShadow: "0 0 12px 2px rgba(242,193,78,0.8)",
          }}
        />
      ))}
    </div>
  );
}

export function LabCaption({ caption }: { caption: { id: number; text: string } | null }) {
  const [visible, setVisible] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (!caption) return;
    const show = window.setTimeout(() => setVisible(caption), 0);
    const hide = window.setTimeout(() => setVisible(null), 2400);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [caption]);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center">
      {visible && (
        <span key={visible.id} className="type-label rounded-full bg-void/80 px-3.5 py-2 text-pearl/75">
          [{visible.text}]
        </span>
      )}
    </div>
  );
}
