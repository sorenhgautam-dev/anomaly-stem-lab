"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, MeshStandardMaterial, Object3D, type InstancedMesh } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { kitMaterial } from "../../materials";
import { HotPlate3D } from "../instruments";
import { vfx } from "../../vfx";

/*
 * A water bath on a hot plate (DESIGN.md §7.5 kit, §8.1 "heat as colour
 * shimmer"): a wide glass beaker of water at `celsius`. The plate glows
 * when the bath is hot and steam drifts off the surface; a cold bath gets
 * floating ice. The water is drawn after the glass and gas inside it
 * (renderOrder, no depth write), so a tube dipped in it stays visible.
 */

export const BATH = { radius: 0.36, height: 0.44, plate: 0.13, water: 0.32 };

const WALL = new CylinderGeometry(BATH.radius, BATH.radius * 0.97, BATH.height, 44, 1, true).translate(0, BATH.height / 2, 0);
const BASE = new CylinderGeometry(BATH.radius * 0.97, BATH.radius * 0.97, 0.02, 44).translate(0, 0.01, 0);
const WATER = new CylinderGeometry(BATH.radius * 0.95, BATH.radius * 0.94, BATH.water, 40).translate(0, BATH.water / 2 + 0.02, 0);
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
  const water = useMemo(() => new MeshStandardMaterial({ color: P.volt[100], transparent: true, opacity: 0.24, roughness: 0.1, depthWrite: false }), []);
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
      vfx.burst({ at: [position[0], surface + 0.02, position[2]], kind: "smoke", count: 1, colors: [P.volt[100], P.grape[300]], speed: [0.14, 0.3], dir: [0, 1, 0], cone: 0.85, life: [1.2, 2], size: [0.06, 0.1], spread: BATH.radius * 0.7, grow: 0.08, drag: 0.7 });
    }
  });

  return (
    <HotPlate3D power={() => Math.max(0, (celsius - 22) / 60)} size={0.92} position={position}>
      <mesh geometry={WALL} material={kitMaterial("glass", tier)} renderOrder={2} />
      <mesh geometry={BASE} material={kitMaterial("glass", tier)} />
      <mesh geometry={WATER} material={water} renderOrder={3} />
      {cold && <instancedMesh ref={ice} args={[ICE, frost, ICE_AT.length]} renderOrder={3} frustumCulled={false} />}
    </HotPlate3D>
  );
}
