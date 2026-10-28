"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Vector3, type Group } from "three";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { labView, setAnchor } from "../lab-state";
import { Colony } from "../kit/bio/Dish3D";
import { Readout } from "../kit/chem/instruments";
import { useSnapshot } from "../kit/chem/heat/useSnapshot";
import { UvMeter3D } from "../kit/apparatus";
import { kitMaterial } from "../kit/materials";
import { orbit, type StageShots } from "../shots";
import { useStageValues } from "../useStageValues";
import { FluffyCloud, Sun } from "../kit/sky";

/*
 * UV on a cloudy day, in 3D (stage "uv", engine/cancer/uv.ts), in the sunny
 * Prevention Lab: a warm gold sun, clouds that roll in as the simulator's
 * cloud cover rises, a UV meter on a stand with its teal face reading the
 * share of a clear day's UV that gets through, and a calm skin-cell panel
 * where small teal marks add up as damage points. Never burns, never red
 * skin. After a wrong guess the meter's ghost label shows the student's idea.
 */


export function uvShots(): StageShots {
  const aim: [number, number, number] = [0, 0.55, 0];
  return {
    arrive: orbit(aim, 6.4, 26, 24),
    build: orbit(aim, 3.8, 12),
    predict: orbit(aim, 3.6, 10, 6),
    run: orbit(aim, 3.5, 10, -4),
    reveal: orbit([0, 0.58, 0], 4, 10),
  };
}

export function UvStage3D() {
  const tier = useQuality((s) => s.level);
  const sv = useStageValues();
  const snap = useSnapshot(sv);
  const cloud = useRef<Group>(null);

  useEffect(() => {
    setAnchor("focus", new Vector3(0.55, 0.75, 0.1));
    setAnchor("ghost", new Vector3(0.55, 1.35, 0));
    setAnchor("ano", new Vector3(-0.1, 0.25, 0.7));
    return () => {
      labView.anchors.delete("ghost");
      labView.anchors.delete("ano");
    };
  }, []);

  // The clouds drift in front of the sun as the simulator's cover rises.
  useFrame(() => {
    const g = cloud.current;
    if (!g) return;
    const c = snap.now.cloud ?? 0;
    g.position.x = -1.4 + c * 0.75;
    g.scale.setScalar(0.4 + c * 0.9);
    g.visible = c > 0.02;
  });

  return (
    <group>
      <Sun position={[-0.75, 1.4, -0.7]} />
      <group ref={cloud} position={[-1.4, 1.3, -0.4]}>
        <FluffyCloud seed={3} bounds={[0.7, 0.18, 0.25]} />
        <FluffyCloud seed={7} bounds={[0.45, 0.14, 0.2]} position={[0.35, 0.08, 0.08]} />
      </group>
      <group position={[0.55, 0, 0]}>
        <UvMeter3D />
      </group>
      <Readout text={() => `UV getting through\n${Math.round((snap.now.uv ?? 1) * 100)}% of a clear day`} style="screen" height={0.07} position={[0.55, 1.05, 0.08]} />
      {/* The skin-cell panel: calm beige, with damage points adding up as small teal marks. */}
      <group position={[-0.45, 0, 0.15]}>
        <RoundedBox args={[0.72, 0.05, 0.52]} radius={0.02} smoothness={3} position={[0, 0.025, 0]} material={kitMaterial("satin", tier, "#EFE3D6")} />
        <Colony count={() => Math.min(300, (snap.now.damage ?? 0) * 1.2)} room={300} radius={0.22} size={0.012} color={LAB.prevention.teal} y={0.06} />
      </group>
      <Readout text={() => `Skin cells\n${Math.round(snap.now.damage ?? 0)} damage points`} height={0.08} position={[-0.45, 0.32, 0.15]} />
    </group>
  );
}
