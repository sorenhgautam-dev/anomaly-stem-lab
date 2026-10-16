"use client";

import { useEffect, useState } from "react";

/*
 * The lab's signature overlays (CLAUDE.md §3.5): the ANOMALY DETECTED glitch
 * on a wrong prediction (it respects reduced motion through the global CSS
 * rules) and captions for every sound cue. The bursts, rings and sparks are
 * drawn by the VFX layer (lib/fx).
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
