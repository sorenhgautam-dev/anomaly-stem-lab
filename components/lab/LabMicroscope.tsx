"use client";

import { LAB } from "@/lib/tokens";
import { useLab } from "@/lib/store";
import { MicroscopeCells, MicroscopeView } from "@/components/lab3d/kit/bio/Microscope";
import { useSnapshot } from "@/components/lab3d/kit/chem/heat/useSnapshot";
import { useStageValues } from "@/components/lab3d/useStageValues";

/*
 * The lab's microscope (the brief's "microscope view"): in the chemo and Cell
 * Lab experiments, the cells that answer the question, live, down a
 * microscope floating under the "What's happening" card (over the lab, so
 * the 3D shows through; a card would hide it), so the student watches them
 * divide, fade or stop while the run plays. It follows the same playback
 * values as the bench (useStageValues), so the two always agree.
 */

const ROOM = 48;

function Cells({ stage }: { stage: "chemo" | "cells" }) {
  const sv = useStageValues();
  const snap = useSnapshot(sv);
  const contact = useLab((s) => s.build?.settings.scene === "contact");
  const dish = useLab((s) => (s.build?.settings.dish === "big" ? 140 : 60));
  if (stage === "chemo") {
    const hair = () => ((snap.now.hair ?? 100) / 100) * ROOM * 1.1;
    return <MicroscopeCells bare count={hair} room={ROOM} color={LAB.robotics.teal} faded={() => Math.max(0, 1 - (snap.now.hair ?? 100) / 100)} ghost={sv.ghost ? () => ((snap.ghost?.hair ?? 100) / 100) * ROOM * 1.1 : null} />;
  }
  if (contact) return <MicroscopeCells bare count={() => ROOM * 1.1 + (snap.now.spread ?? 0)} room={ROOM} color={LAB.chemistry.sage} ghost={sv.ghost ? () => snap.ghost?.spread ?? 0 : null} />;
  // The normal cells fill the view as they fill their dish, then stop.
  return <MicroscopeCells bare count={() => Math.min(1, (snap.now.normal ?? 4) / dish) * ROOM * 1.1} room={ROOM} color={LAB.chemistry.sage} />;
}

const CAPTION: Record<"chemo" | "cells", string> = { chemo: "Under the microscope: hair follicle cells", cells: "Under the microscope: the normal cells" };

export function LabMicroscope({ stage, className }: { stage: "chemo" | "cells"; className?: string }) {
  return (
    <MicroscopeView label={CAPTION[stage]} surroundClassName="[--surround:transparent]" className={className} caption={<span className="paper-card inline-block rounded-full px-3 py-1 text-[13px] font-semibold text-ink-700">{CAPTION[stage]}</span>}>
      <Cells stage={stage} />
    </MicroscopeView>
  );
}
