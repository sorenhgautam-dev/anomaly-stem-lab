"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, Object3D, type InstancedMesh } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import { corner, latheGeometry, shellGeometry } from "../../detail";
import { kitMaterial } from "../../materials";
import { HotPlate3D } from "../instruments";
import { vfx } from "../../vfx";

/*
 * A water bath on a hot plate (DESIGN.md §7.5 kit, §8.1 "heat as colour
 * shimmer", §8.2): a wide glass vessel (real wall thickness, a rounded heel
 * and a beaded rim) of faintly sage-tinted water at `celsius`. The plate glows
 * when the bath is hot and steam drifts off the surface; a cold bath gets
 * floating ice. The water is drawn after the glass and gas inside it
 * (renderOrder, no depth write), so a tube dipped in it stays visible.
 */

export const BATH = { radius: 0.36, height: 0.44, plate: 0.13, water: 0.32 };

const BR = BATH.radius;
const VESSEL = shellGeometry([[0, 0], [BR - 0.03, 0], ...corner(BR - 0.03, 0.03, 0.03, -Math.PI / 2, 0).slice(1), [BR, BATH.height - 0.012], [BR + 0.007, BATH.height]], 0.008, 0.014, 72);
const WATER = latheGeometry([[0.001, 0.016], [BR - 0.04, 0.016], [BR - 0.017, 0.028], [BR - 0.0095, 0.05], [BR - 0.0095, BATH.water + 0.02], [0.001, BATH.water + 0.02]], 56);
const ICE = new RoundedBoxGeometry(0.09, 0.08, 0.09, 2, 0.022);
const ICE_AT: [number, number][] = [
  [-0.25, -0.06],
  [-0.13, -0.22],
  [0.03, -0.26],
  [0.28, 0.08],
  [0.0, 0.25],
  [-0.24, 0.14],
];
const tmp = new Object3D();

export function WaterBath3D({ celsius, position }: { celsius: number; position: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const ice = useRef<InstancedMesh>(null);
  const steam = useRef(0);
  const water = useMemo(() => new MeshStandardMaterial({ color: LAB.chemistry.sage, transparent: true, opacity: 0.24, roughness: 0.08, depthWrite: false }), []);
  const frost = useMemo(() => new MeshStandardMaterial({ color: P.white, transparent: true, opacity: 0.78, roughness: 0.12 }), []);
  useEffect(
    () => () => {
      water.dispose();
      frost.dispose();
    },
    [water, frost],
  );
  const cold = celsius <= 8;
  const surface = position[1] + BATH.plate + BATH.water + 0.02;

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const time = clock.elapsedTime;
    if (cold && ice.current) {
      for (let i = 0; i < ICE_AT.length; i++) {
        tmp.position.set(ICE_AT[i][0], BATH.water + 0.01 + Math.sin(time * 1.3 + i * 1.7) * 0.006, ICE_AT[i][1]);
        tmp.rotation.set(0.2 * Math.sin(i), time * 0.1 + i, 0.15 * Math.cos(i * 2));
        tmp.updateMatrix();
        ice.current.setMatrixAt(i, tmp.matrix);
      }
      ice.current.instanceMatrix.needsUpdate = true;
    }
    // Steam off a hot bath: more the hotter it is.
    steam.current += Math.max(0, (celsius - 45) / 35) * 3 * dt;
    while (steam.current >= 1) {
      steam.current -= 1;
      vfx.burst({ at: [position[0], surface + 0.02, position[2]], kind: "smoke", count: 1, colors: [P.white, LAB.chemistry.sage], speed: [0.14, 0.3], dir: [0, 1, 0], cone: 0.85, life: [1.2, 2], size: [0.06, 0.1], spread: BATH.radius * 0.7, grow: 0.08, drag: 0.7 });
    }
  });

  return (
    <HotPlate3D power={() => Math.max(0, (celsius - 22) / 60)} size={0.92} position={position}>
      <mesh geometry={VESSEL} material={kitMaterial("glass", tier)} renderOrder={2} />
      <mesh geometry={WATER} material={water} renderOrder={3} />
      {cold && <instancedMesh ref={ice} args={[ICE, frost, ICE_AT.length]} renderOrder={3} frustumCulled={false} />}
    </HotPlate3D>
  );
}
