"use client";

import { useEffect } from "react";
import { useProgress } from "@/lib/progress";

/** Loads saved progress from IndexedDB once, after mount. */
export function ProgressHydrator() {
  const hydrate = useProgress((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  return null;
}
