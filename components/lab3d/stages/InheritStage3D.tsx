"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Vector3, type Group, type Mesh } from "three";
import { inheritSettings, lifeChanges, NEEDED } from "@/engine/cancer/inherit";
import { RUN_SECONDS } from "@/engine/chemistry/common";
import { useQuality } from "@/lib/quality";
import { useLab } from "@/lib/store";
import { LAB } from "@/lib/tokens";
import { labView, setAnchor } from "../lab-state";
import { Colony } from "../kit/bio/Dish3D";
import { Field3D } from "../kit/bio/Field3D";
import { Readout } from "../kit/chem/instruments";
import { useSnapshot } from "../kit/chem/heat/useSnapshot";
import { kitMaterial } from "../kit/materials";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";

/*
 * Born with it?, in 3D (stage "inherit", engine/cancer/inherit.ts), in the
 * teal Cell Lab: one living cell in a microscope field, a row of five change slots
 * beside it and a lifetime bar in front, from birth to older age. As the
 * marker moves along the bar, changes arrive from the simulator's own list:
 * a teal one from birth (if switched on), gold ones during life. Each fills
 * a slot. Once all five are full the cell stops following the rules and
 * starts dividing, calmly. After a wrong guess a dashed label shows how
 * many changes the student expected from birth and from life.
 */

const BAR = { from: -0.75, to: 0.75, z: 0.36 } as const;
const DISH_X = -0.42;
const SLOT_X0 = 0.08;
const SLOT_GAP = 0.15;
const TEAL = LAB.chemistry.wall;
const GOLD = LAB.chemistry.gold;

export function inheritShots(): StageShots {
  // Aimed in front of the dish, so the bench sits high and the lifetime bar stays clear of the result panel.
  const aim: [number, number, number] = [0, 0.06, 0.3];
  return {
    arrive: orbit(aim, 6, 44, 22),
    build: orbit(aim, 3.2, 38),
    predict: orbit(aim, 3, 36, 6),
    run: orbit(aim, 2.9, 38, -4),
    reveal: orbit([0, 0.08, 0.32], 3.3, 36),
  };
}

export function InheritStage3D() {
  const tier = useQuality((s) => s.level);
  const def = useLab((s) => s.def)!;
  const build = useLab((s) => s.build)!;
  const sv = useStageValues();
  const snap = useSnapshot(sv);
  const { inherited, exposure } = inheritSettings(def, build);
  const changes = useMemo(() => lifeChanges("real", inherited, exposure), [inherited, exposure]);
  const thresholdAt = changes.length >= NEEDED ? changes[NEEDED - 1].at : 2;
  const marker = useRef<Group>(null);
  const pegs = useRef<(Mesh | null)[]>([]);
  const slots = useRef<(Mesh | null)[]>([]);

  useEffect(() => {
    setAnchor("focus", new Vector3(0.38, 0.1, 0));
    setAnchor("ghost", new Vector3(0.38, 0.62, 0));
    setAnchor("ano", new Vector3(0.98, 0.1, 0.3));
    return () => {
      labView.anchors.delete("ghost");
      labView.anchors.delete("ano");
    };
  }, []);

  const lifeNow = () => (sv.outcome ? Math.min(1, sv.t() / RUN_SECONDS) : 0);

  useFrame(() => {
    const f = lifeNow();
    if (marker.current) marker.current.position.x = BAR.from + (BAR.to - BAR.from) * f;
    // Pegs on the bar and slots beside the dish show only the changes that have arrived (before a run, the one from birth).
    changes.forEach((c, i) => {
      const here = c.at <= f;
      const peg = pegs.current[i];
      if (peg) peg.visible = here;
      if (i < NEEDED) {
        const slot = slots.current[i];
        if (slot) slot.visible = here;
      }
    });
  });

  // The cell divides calmly once it has all five changes; before that it stays one cell.
  const goldCells = () => {
    const f = lifeNow();
    return f >= thresholdAt ? Math.min(40, 1 + (f - thresholdAt) * RUN_SECONDS * 9) : 0;
  };
  const fromBirth = () => Math.round(snap.now.inherited ?? (inherited ? 1 : 0));
  const duringLife = () => Math.round(snap.now.during ?? 0);

  return (
    <group>
      <Field3D radius={0.3} position={[DISH_X, 0, 0]}>
        <Colony count={() => (goldCells() > 0 ? 0 : 1)} room={12} radius={0.05} size={0.11} color={LAB.chemistry.sage} glow={0.32} />
        <Colony count={goldCells} room={30} radius={0.24} size={0.06} color={GOLD} glow={0.32} />
      </Field3D>
      <Readout text={() => ((snap.now.broken ?? 0) > 0.5 ? "This cell has stopped\nfollowing the rules" : "This cell is following\nthe rules")} height={0.075} position={[DISH_X, 0.36, -0.05]} />

      {/* Five slots: the changes this cell needs before it stops following the rules. */}
      {Array.from({ length: NEEDED }, (_, i) => (
        <group key={i} position={[SLOT_X0 + i * SLOT_GAP, 0, 0]}>
          <RoundedBox args={[0.12, 0.02, 0.12]} radius={0.01} smoothness={3} position={[0, 0.01, 0]} material={kitMaterial("plastic", tier)} />
          <mesh
            ref={(m) => {
              slots.current[i] = m;
            }}
            position={[0, 0.045, 0]}
            visible={false}
            material={kitMaterial("satin", tier, changes[i]?.cause === "inherited" ? TEAL : GOLD)}
          >
            <sphereGeometry args={[0.042, 32, 20]} />
          </mesh>
        </group>
      ))}
      <Readout text={() => `Changes needed: ${NEEDED}\nFrom birth ${fromBirth()} · During life ${duringLife()}`} height={0.075} position={[SLOT_X0 + 2 * SLOT_GAP, 0.2, 0]} />
      {sv.ghost && <Readout style="ghost" text={() => `Your idea\nFrom birth ${Math.round(snap.ghost?.inherited ?? 0)} · During life ${Math.round(snap.ghost?.during ?? 0)}`} height={0.075} position={[SLOT_X0 + 2 * SLOT_GAP, 0.42, -0.05]} />}

      {/* The lifetime bar, from birth to older age, with a peg for each change as it arrives. */}
      <RoundedBox args={[BAR.to - BAR.from + 0.08, 0.025, 0.05]} radius={0.012} smoothness={3} position={[0, 0.013, BAR.z]} material={kitMaterial("plastic", tier)} />
      {changes.map((c, i) => (
        <mesh
          key={i}
          ref={(m) => {
            pegs.current[i] = m;
          }}
          position={[BAR.from + (BAR.to - BAR.from) * c.at, 0.05, BAR.z]}
          visible={false}
          material={kitMaterial("satin", tier, c.cause === "inherited" ? TEAL : GOLD)}
        >
          <cylinderGeometry args={[0.016, 0.016, 0.05, 20]} />
        </mesh>
      ))}
      <group ref={marker} position={[BAR.from, 0.045, BAR.z]}>
        <mesh material={kitMaterial("black", tier)}>
          <cylinderGeometry args={[0.03, 0.03, 0.035, 32]} />
        </mesh>
      </group>
      <Readout text={() => "Birth"} height={0.055} position={[BAR.from, 0.12, BAR.z]} />
      <Readout text={() => "Older age"} height={0.055} position={[BAR.to, 0.12, BAR.z]} />
    </group>
  );
}
