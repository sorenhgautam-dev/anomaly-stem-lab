"use client";

import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { CatmullRomCurve3, PlaneGeometry, SphereGeometry, TubeGeometry, Vector3 } from "three";
import { useQuality } from "@/lib/quality";
import { LAB, PALETTE as P } from "@/lib/tokens";
import type { Getter } from "../glass";
import { Readout } from "../instruments";
import { canvasTexture, decalMaterial, latheGeometry, SANS } from "../../detail";
import { kitMaterial } from "../../materials";

/*
 * A bench pH meter (DESIGN.md §8 "rounded instruments with small screens in
 * Martian Mono", §8.2): a bevelled white body with a black bezel round its
 * screen (the simulator's pH in sand gold), two buttons and a printed name,
 * and a graphite cable to a probe: an epoxy body ending in a glass bulb,
 * dipped into the liquid. `probe` is the probe's top, relative to the
 * meter; it hangs `depth` straight down.
 */

const LABEL = new PlaneGeometry(0.13, 0.026);
const BULB = new SphereGeometry(0.0115, 16, 10);

function nameplate() {
  return canvasTexture("ph-meter-name", 240, 48, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = P.ink[500];
    ctx.font = `700 26px ${SANS}`;
    ctx.textBaseline = "middle";
    ctx.fillText("pH METER", 4, h / 2);
  });
}

export function PhMeter3D({ ph, probe, depth, position }: { ph: Getter<number>; probe: [number, number, number]; depth: number; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const [px, py, pz] = probe;
  const cable = useMemo(() => {
    // The cable leaves the back of the meter and sags a little on its way up to the probe.
    const curve = new CatmullRomCurve3([new Vector3(0, 0.22, -0.07), new Vector3(px * 0.35, 0.3, pz - 0.08), new Vector3(px * 0.8, py + 0.08, pz - 0.02), new Vector3(px, py + 0.012, pz)]);
    return new TubeGeometry(curve, 48, 0.0065, 8, false);
  }, [px, py, pz]);
  // The probe: a long epoxy body, wider at the cap where the cable enters, with the glass bulb below it.
  const body = useMemo(() => latheGeometry([[0.0005, 0.02], [0.011, 0.021], [0.013, 0.03], [0.015, 0.042], [0.015, depth - 0.05], [0.019, depth - 0.045], [0.019, depth - 0.004], [0.012, depth + 0.006], [0.0005, depth + 0.008]], 24), [depth]);
  useEffect(
    () => () => {
      cable.dispose();
      body.dispose();
    },
    [cable, body],
  );
  return (
    <group position={position}>
      <group rotation={[-0.18, 0, 0]}>
        <RoundedBox args={[0.36, 0.26, 0.12]} radius={0.045} smoothness={5} position={[0, 0.13, 0]} material={kitMaterial("plastic", tier)} />
        <RoundedBox args={[0.3, 0.125, 0.016]} radius={0.007} smoothness={2} position={[0, 0.13, 0.06]} material={kitMaterial("ink", tier)} />
        <RoundedBox args={[0.06, 0.026, 0.018]} radius={0.008} smoothness={2} position={[-0.06, 0.042, 0.058]} material={kitMaterial("sand", tier)} />
        <RoundedBox args={[0.06, 0.026, 0.018]} radius={0.008} smoothness={2} position={[0.06, 0.042, 0.058]} material={kitMaterial("satin", tier, LAB.chemistry.bench)} />
        <mesh geometry={LABEL} position={[-0.075, 0.207, 0.0605]} material={decalMaterial("ph-meter-name", nameplate())} />
        {/* Fixed width, so the screen's board keeps one size as the reading changes. */}
        <Readout text={() => `pH ${ph().toFixed(2).padStart(5)}`} style="screen" height={0.1} position={[0, 0.13, 0.1]} />
      </group>
      <mesh geometry={cable} material={kitMaterial("insulation", tier)} />
      <mesh geometry={body} position={[px, py - depth, pz]} material={kitMaterial("ink", tier)} />
      <mesh geometry={BULB} position={[px, py - depth + 0.012, pz]} material={kitMaterial("glass", tier)} renderOrder={2} />
    </group>
  );
}
