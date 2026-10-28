"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CylinderGeometry, type BufferGeometry, type Group } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import type { Getter } from "../glass";
import { Readout } from "../instruments";
import { canvasTexture, corner, decalMaterial, latheGeometry, mergeParts, MONO, shellGeometry } from "../../detail";
import { kitMaterial } from "../../materials";

/*
 * A sealed syringe lying along x (DESIGN.md §7.5 kit, §8.2): a clear barrel
 * with real wall thickness, printed every 5 mL and numbered every 10, a luer
 * nozzle at the sealed end, a white finger flange, and a plunger with a
 * ribbed rubber seal, a cross-vaned rod and a sand-gold thumb pad. The
 * group's origin is the sealed end; the barrel runs towards -x and the
 * plunger's face sits `volume` mL from the end, with a small label riding on it.
 */

/** Barrel length per mL. */
export const ML = 0.01;
const MAX_ML = 75;
const LENGTH = MAX_ML * ML;
const ROD = 0.66;
const SEAL = 0.05;
const WALL = 0.008;

/** Lathes are built along +y; these turn +y to -x (the barrel's way) or +x (the nozzle's). */
const toMinusX = (g: BufferGeometry) => g.rotateZ(Math.PI / 2);
const toPlusX = (g: BufferGeometry) => g.rotateZ(-Math.PI / 2);

/** Graduations round the front and top of the barrel: a tick every 5 mL, numbered every 10, 0 at the sealed end. */
function scaleMaterial() {
  const map = canvasTexture("syringe-scale", 256, 1024, (ctx, w, h) => {
    ctx.fillStyle = P.ink[900];
    ctx.font = `600 34px ${MONO}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    for (let ml = 5; ml <= 70; ml += 5) {
      const y = h - (ml / MAX_ML) * h;
      const major = ml % 10 === 0;
      // Canvas x runs round the barrel; the ticks start at its front.
      ctx.fillRect(14, y - 2.5, major ? 92 : 56, 5);
      if (major) {
        // Numbers turned to read along the barrel on screen.
        ctx.save();
        ctx.translate(150, y);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(String(ml), 0, 0);
        ctx.restore();
      }
    }
  });
  return decalMaterial("syringe-scale", map, 0.9);
}

function syringeShapes(r: number) {
  const barrel = shellGeometry([[0, 0], [r - 0.024, 0], ...corner(r - 0.024, 0.024, 0.024, -Math.PI / 2, 0, 6).slice(1), [r, LENGTH]], WALL, WALL * 1.6, 48);
  const nozzle = latheGeometry([[0.0005, 0], [r * 0.34, 0], [r * 0.3, 0.018], [0.021, 0.028], [0.017, 0.082], [0.012, 0.086], [0.0005, 0.086]], 24);
  // The seal's face is at the group's origin; it reaches back SEAL along -x, with two ribs that touch the wall.
  const ri = r - WALL;
  const seal = latheGeometry(
    [
      [0.0005, -0.01],
      [ri * 0.6, -0.006],
      [ri * 0.94, 0],
      [ri, 0.006],
      [ri, 0.014],
      [ri * 0.93, 0.019],
      [ri * 0.93, 0.031],
      [ri, 0.036],
      [ri, 0.044],
      [ri * 0.9, SEAL],
      [0.0005, SEAL],
    ],
    36,
  );
  const vane = (w: number, d: number) => new BoxGeometry(ROD, w, d).translate(-SEAL - ROD / 2, 0, 0);
  const pad = latheGeometry([[0.0005, 0], [0.11, 0], ...corner(0.11, 0.012, 0.012, -Math.PI / 2, Math.PI / 2, 6).slice(1), [0.0005, 0.024]], 36);
  return {
    glass: mergeParts([toMinusX(barrel), toPlusX(nozzle)]),
    scale: toMinusX(new CylinderGeometry(r + 0.0015, r + 0.0015, LENGTH, 32, 1, true, 0.12, 0.8).translate(0, LENGTH / 2, 0)),
    flange: new RoundedBoxGeometry(0.022, r * 3.2, r * 1.7, 3, 0.009).translate(-LENGTH - 0.005, 0, 0),
    seal: toMinusX(seal),
    rod: mergeParts([vane(0.014, r * 1.1), vane(r * 1.1, 0.014), new CylinderGeometry(r * 0.7, r * 0.7, 0.012, 28).rotateZ(Math.PI / 2).translate(-SEAL - 0.006, 0, 0)]),
    pad: toMinusX(pad).translate(-SEAL - ROD, 0, 0),
  };
}

const cache = new Map<number, ReturnType<typeof syringeShapes>>();

export function Syringe3D({ volume, radius = 0.14 }: { volume: Getter<number>; radius?: number }) {
  const tier = useQuality((s) => s.level);
  const plunger = useRef<Group>(null);
  const g = useMemo(() => {
    let hit = cache.get(radius);
    if (!hit) {
      hit = syringeShapes(radius);
      cache.set(radius, hit);
    }
    return hit;
  }, [radius]);

  useFrame(() => {
    if (plunger.current) plunger.current.position.x = -Math.max(0, Math.min(MAX_ML, volume())) * ML;
  });

  return (
    <group>
      <mesh geometry={g.scale} material={scaleMaterial()} renderOrder={1} />
      <mesh geometry={g.glass} material={kitMaterial("glass", tier)} renderOrder={2} />
      <mesh geometry={g.flange} material={kitMaterial("plastic", tier)} />
      <group ref={plunger}>
        <mesh geometry={g.seal} material={kitMaterial("rubber", tier)} />
        <mesh geometry={g.rod} material={kitMaterial("plastic", tier)} />
        <mesh geometry={g.pad} material={kitMaterial("sand", tier)} />
        {/* Fixed width, so the label's board keeps one size as it counts. */}
        <Readout text={() => `${Math.round(volume()).toString().padStart(2)} mL`} height={0.085} position={[-0.02, radius + 0.11, 0]} />
      </group>
    </group>
  );
}
