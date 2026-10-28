"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Vector3, type Mesh } from "three";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { labView, setAnchor } from "../lab-state";
import { Field3D, MixedCells } from "../kit/bio/Field3D";
import { Readout } from "../kit/chem/instruments";
import { useSnapshot } from "../kit/chem/heat/useSnapshot";
import { kitMaterial, ownMaterial } from "../kit/materials";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Why chemo causes hair loss, in 3D (stage "chemo", engine/cancer/chemo.ts):
 * one big microscope field on the Treatment Lab's bench with all three kinds
 * of cells mixed in it, each in its own bold colour: cancer cells gold, hair
 * follicle cells teal, slow-dividing cells sage. Every count follows the
 * simulator: when treatment runs, the busy gold and teal cells shrink away
 * from the edge of the field inwards and grey a little; the sage cells
 * barely change; once treatment stops the teal cells slowly refill. Beside
 * the field (under it on tall screens) three bars empty and refill in real
 * time, each with its name and a big number. After a wrong guess a white tick on the hair bar and a dashed
 * label show the student's idea beside what really happened. Calm, never
 * graphic: cells shrink and fade, they never burst.
 */

const R = 0.48;
const ROOM = 40;
const KINDS = [
  { key: "cancer", name: "Cancer cells", color: LAB.robotics.gold },
  { key: "hair", name: "Hair follicle cells", color: LAB.robotics.teal },
  { key: "slow", name: "Slow-dividing cells", color: LAB.chemistry.sage },
] as const;
type Kind = (typeof KINDS)[number]["key"];
/** The bars: a column to the right of the field on wide screens, under it on tall ones. */
const BAR = { width: 0.45, gap: 0.3 } as const;
const WIDE = { field: [-0.34, 0, 0] as [number, number, number], bars: (i: number): [number, number] => [0.5, (i - 1) * BAR.gap + 0.06] };
const TALL = { field: [0, 0, -0.42] as [number, number, number], bars: (i: number): [number, number] => [-0.08, R - 0.24 + i * BAR.gap] };
const isTall = () => typeof window !== "undefined" && window.innerWidth < window.innerHeight;

export function chemoShots(): StageShots {
  // High above the field, so it reads as one round view down the microscope, with the bars beside it (under it on tall screens).
  const tall = isTall();
  const aim: [number, number, number] = tall ? [0, 0.05, 0.25] : [0.08, 0.05, 0.05];
  const k = tall ? 0.86 : 1.06;
  return {
    arrive: orbit(aim, 6.2 * k, 60, 22),
    build: orbit(aim, 3.3 * k, 58),
    predict: orbit(aim, 3.2 * k, 56, 4),
    run: orbit(aim, 3.1 * k, 60, -3),
    reveal: orbit(aim, 3.4 * k, 56),
  };
}

const pct = (v: number | undefined) => v ?? 100;

/** One bar: a dark track and a coloured fill that shrinks from the right (a scale, so the bar never re-lays out). */
function Bar({ kind, at, value, ghost }: { kind: (typeof KINDS)[number]; at: [number, number]; value: () => number; ghost: () => number | null }) {
  const tier = useQuality((s) => s.level);
  const fill = useRef<Mesh>(null);
  const tick = useRef<Mesh>(null);
  const mat = useMemo(() => ownMaterial(kind.color, tier, { emissive: kind.color }), [kind.color, tier]);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(() => {
    const v = Math.max(0.001, Math.min(1, value() / 100));
    if (fill.current) {
      fill.current.scale.x = v;
      fill.current.position.x = -BAR.width / 2 + (BAR.width * v) / 2;
    }
    const g = ghost();
    if (tick.current) {
      tick.current.visible = g !== null;
      if (g !== null) tick.current.position.x = -BAR.width / 2 + BAR.width * Math.min(1, g / 100);
    }
  });
  return (
    <group position={[at[0], 0, at[1]]}>
      <RoundedBox args={[BAR.width + 0.03, 0.02, 0.06]} radius={0.01} smoothness={3} position={[0, 0.01, 0]} material={kitMaterial("black", tier)} />
      <mesh ref={fill} position={[0, 0.026, 0]} material={mat}>
        <boxGeometry args={[BAR.width, 0.014, 0.036]} />
      </mesh>
      <mesh ref={tick} position={[0, 0.04, 0]} visible={false}>
        <boxGeometry args={[0.008, 0.03, 0.07]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
}

export function ChemoStage3D() {
  const sv = useStageValues();
  const snap = useSnapshot(sv);
  const tall = useThree((s) => s.size.width < s.size.height);
  const L = tall ? TALL : WIDE;

  useEffect(() => {
    // The hair bar shows the answer; the guess's label floats above the field; Ano waits behind the bars.
    const [hx, hz] = L.bars(1);
    setAnchor("focus", new Vector3(hx, 0.08, hz));
    // The guess's own label waits above the bars, clear of the top bar and the field.
    const [tx, tz] = L.bars(0);
    setAnchor("ghost", new Vector3(tx + 0.1, 0.25, tz - 0.42));
    setAnchor("ano", tall ? new Vector3(R + 0.35, 0.12, -0.3) : new Vector3(1.25, 0.12, -0.25));
    return () => {
      labView.anchors.delete("ghost");
      labView.anchors.delete("ano");
    };
  }, [L, tall]);

  const count = (key: Kind) => () => (pct(snap.now[key]) / 100) * ROOM;
  const hit = (key: Kind) => () => Math.max(0, 1 - pct(snap.now[key]) / 100);
  const value = (key: Kind) => () => pct(snap.now[key]);
  const ghostHair = () => (sv.ghost ? pct(snap.ghost?.hair) : null);

  return (
    <group>
      <Field3D radius={R} position={L.field}>
        <MixedCells room={ROOM} radius={R - 0.06} size={0.05} kinds={KINDS.map((k) => ({ key: k.key, color: k.color, count: count(k.key), faded: hit(k.key) }))} />
      </Field3D>
      {KINDS.map((k, i) => {
        const at = L.bars(i);
        return (
          <group key={k.key}>
            <Bar kind={k} at={at} value={value(k.key)} ghost={k.key === "hair" ? ghostHair : () => null} />
            {/* The name above the bar, the number big at its end. */}
            <Readout text={() => k.name} height={0.05} position={[at[0] - 0.04, 0.1, at[1] - 0.09]} />
            <Readout text={() => `${Math.round(value(k.key)())}%`} height={0.085} position={[at[0] + BAR.width / 2 + 0.13, 0.08, at[1]]} />
          </group>
        );
      })}
      {sv.ghost && <Readout style="ghost" text={() => `Your idea: hair cells ${Math.round(pct(snap.ghost?.hair))}%`} height={0.055} position={[L.bars(0)[0] + 0.08, 0.12, L.bars(0)[1] - 0.3]} />}
      <Readout text={() => ((snap.now.chemo ?? 0) > 0.5 ? "Treatment on" : sv.outcome ? "Treatment off" : "Ready")} style="screen" height={0.06} position={[L.field[0], 0.2, L.field[2] - R - 0.12]} />
    </group>
  );
}
