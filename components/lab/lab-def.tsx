"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { initialBuild } from "@/engine/edits";
import type { Build, ExperimentDef } from "@/engine/types";
import { useLab } from "@/lib/store";

/*
 * The experiment a lab page shows, known from the first render. The lab store
 * fills in only after the page mounts, so the server's HTML (and the first
 * client paint) would otherwise draw empty panels that grow a moment later
 * (a layout shift). Panels read the store's experiment and build, falling
 * back to the page's experiment and its starting build until then.
 */

const LabDef = createContext<ExperimentDef | null>(null);

export function LabDefProvider({ def, children }: { def: ExperimentDef; children: ReactNode }) {
  return <LabDef.Provider value={def}>{children}</LabDef.Provider>;
}

export function useLabDef(): ExperimentDef | null {
  const stored = useLab((s) => s.def);
  const page = useContext(LabDef);
  return stored && (!page || stored.id === page.id) ? stored : page;
}

export function useLabBuild(): Build | null {
  const stored = useLab((s) => s.build);
  const def = useLabDef();
  const start = useMemo(() => (def ? initialBuild(def) : null), [def]);
  return stored && def && stored.experimentId === def.id ? stored : start;
}
