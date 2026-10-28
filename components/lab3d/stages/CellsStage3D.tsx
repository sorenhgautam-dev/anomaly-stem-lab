"use client";

import { useEffect } from "react";
import { Vector3 } from "three";
import { useLab } from "@/lib/store";
import { LAB } from "@/lib/tokens";
import { labView, setAnchor } from "../lab-state";
import { Colony } from "../kit/bio/Dish3D";
import { Field3D } from "../kit/bio/Field3D";
import { Readout } from "../kit/chem/instruments";
import { useSnapshot } from "../kit/chem/heat/useSnapshot";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Cells out of control and the contact test, in 3D (stage "cells",
 * engine/cancer/cells.ts), in the teal Cell Lab.
 *  - Fill: two microscope fields side by side (Field3D). Normal cells (sage) fill their field and
 *    stop; cancer cells (gold) keep dividing and pile up in a second layer.
 *  - Contact: the cancer dish and another person's dish of normal cells sit
 *    touching. The simulator decides what crosses: nothing does. After a
 *    wrong guess, see-through cells show where the student's idea expected
 *    cancer cells to arrive.
 */

const ROOM = { small: 60, big: 140 } as const;

export function cellsShots(): StageShots {
  const aim: [number, number, number] = [0, 0.18, 0];
  return {
    arrive: orbit(aim, 6, 44, 24),
    build: orbit(aim, 3.2, 34),
    predict: orbit(aim, 3, 32, 6),
    run: orbit(aim, 2.9, 34, -4),
    reveal: orbit([0, 0.22, 0], 3.4, 30),
  };
}

export function CellsStage3D() {
  const sv = useStageValues();
  const snap = useSnapshot(sv);
  const scene = useLab((s) => (s.build?.settings.scene === "contact" ? "contact" : "fill"));
  const big = useLab((s) => s.build?.settings.dish === "big");
  const room = big ? ROOM.big : ROOM.small;
  // Touching dishes sit closer, rim to rim.
  const gap = scene === "contact" ? 0.29 : 0.42;

  useEffect(() => {
    setAnchor("focus", new Vector3(scene === "contact" ? gap : -gap, 0.1, 0.1));
    setAnchor("ghost", new Vector3(scene === "contact" ? gap : -gap, 0.72, 0));
    setAnchor("ano", new Vector3(0, 0.2, 0.62));
    return () => {
      labView.anchors.delete("ghost");
      labView.anchors.delete("ano");
    };
  }, [scene, gap]);

  if (scene === "contact") {
    return (
      <group>
        <Field3D radius={0.28} position={[-gap, 0, 0]}>
          <Colony count={() => Math.min(300, snap.now.cancer ?? 4)} room={70} radius={0.24} color={LAB.chemistry.gold} glow={0.32} />
        </Field3D>
        <Field3D radius={0.28} position={[gap, 0, 0]}>
          <Colony count={() => 70} room={70} radius={0.24} color={LAB.chemistry.sage} glow={0.32} />
          <Colony count={() => snap.now.spread ?? 0} room={30} radius={0.12} color={LAB.chemistry.gold} glow={0.32} y={0.07} />
          {sv.ghost && <Colony count={() => snap.ghost?.spread ?? 0} room={30} radius={0.12} color="#ffffff" opacity={0.5} y={0.08} />}
        </Field3D>
        {/* Staggered heights, so the two labels never overlap on a narrow screen. */}
        <Readout text={() => "Person A: cancer cells"} height={0.07} position={[-gap, 0.5, -0.05]} />
        <Readout text={() => `Person B: normal cells\n${Math.round(snap.now.spread ?? 0)} crossed over`} height={0.07} position={[gap, 0.3, 0.05]} />
        <Readout text={() => ((snap.now.touching ?? 0) > 0.5 ? "Touching" : sv.outcome ? "Apart" : "Ready")} style="screen" height={0.06} position={[0, 0.58, -0.3]} />
      </group>
    );
  }
  return (
    <group>
      <Field3D radius={big ? 0.36 : 0.28} position={[-gap, 0, 0]}>
        <Colony count={() => snap.now.normal ?? 4} room={room} radius={big ? 0.32 : 0.24} color={LAB.chemistry.sage} glow={0.32} />
        {sv.ghost && <Colony count={() => snap.ghost?.normal ?? 4} room={room} radius={big ? 0.32 : 0.24} color="#ffffff" opacity={0.45} y={0.07} />}
      </Field3D>
      <Field3D radius={0.28} position={[gap, 0, 0]}>
        <Colony count={() => Math.min(300, snap.now.cancer ?? 4)} room={60} radius={0.24} color={LAB.chemistry.gold} glow={0.32} />
      </Field3D>
      <Readout text={() => `Normal cells\n${Math.round(snap.now.normal ?? 4)}${(snap.now.full ?? 0) > 0.5 ? ", dish full" : ""}`} height={0.08} position={[-gap, 0.36, 0]} />
      <Readout text={() => `Cancer cells\n${Math.round(snap.now.cancer ?? 4)}`} height={0.08} position={[gap, 0.36, 0]} />
    </group>
  );
}
