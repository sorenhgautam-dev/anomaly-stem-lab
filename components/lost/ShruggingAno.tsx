"use client";

import { useEffect, useState } from "react";
import { AnoView } from "@/components/ano/AnoView";
import { prefersReducedMotion } from "@/lib/motion";

/*
 * Ano on the 404 page (DESIGN.md §7.8): stands there and shrugs every few
 * seconds, "no idea where that page went". Reduced motion: one shrug only.
 */

const EVERY_MS = 3600;

export function ShruggingAno({ className }: { className?: string }) {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const first = window.setTimeout(() => setKey(1), 700);
    if (prefersReducedMotion()) return () => window.clearTimeout(first);
    const id = window.setInterval(() => setKey((k) => k + 1), EVERY_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return <AnoView className={className} expression="curious" action={key ? { move: "shrug", key } : null} label="Ano shrugging" />;
}
