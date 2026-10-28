"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, PlaneGeometry, TorusGeometry, type BufferGeometry, type Mesh, type MeshStandardMaterial } from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { canvasTexture, corner, decalMaterial, latheGeometry, MONO, type Profile } from "../../detail";
import { kitMaterial, ownMaterial } from "../../materials";
import { TextBoard } from "../../TextBoard";
import type { Getter } from "../glass";
import { TONE } from "./tones";

/*
 * A glass spirit thermometer (DESIGN.md §7.5, §8.2): a lathed rod with an
 * elongated bulb and a rounded end, a white enamel scale printed every 5°
 * behind the bore, a column of sand-gold spirit that rises with the reading
 * between `min` and `max`, and a steel hanging ring. A small LCD label shows
 * the number, and after a wrong run a dashed ghost label shows the student's
 * predicted temperature. (Sand gold, not red: red is the ANOMALY's colour.)
 */

const ROD = 0.022;
const BULB = 0.03;
/** Where the column starts above the bulb's bottom, and how far below the end it can reach. */
const BASE = 0.085;
const HEADROOM = 0.09;

function rodProfile(height: number): Profile {
  return [
    ...corner(0, BULB, BULB, -Math.PI / 2, 0, 8),
    [BULB, 0.07],
    [ROD, 0.105],
    [ROD, height - ROD],
    ...corner(0, height - ROD, ROD, 0, Math.PI / 2, 6).slice(1),
  ];
}

/** The scale: ticks every 5°, longer every 10°, numbers every 20°, from `min` at the bottom to `max` at the top. */
function scaleMaterial(min: number, max: number) {
  const map = canvasTexture(`thermometer-${min}-${max}`, 96, 768, (ctx, w, h) => {
    ctx.fillStyle = P.white;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = P.ink[900];
    ctx.font = `600 22px ${MONO}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    for (let t = Math.ceil(min / 5) * 5; t <= max; t += 5) {
      const y = h - ((t - min) / (max - min)) * h;
      const major = t % 10 === 0;
      ctx.fillRect(0, y - 1.5, major ? 34 : 20, 3);
      if (t % 20 === 0 && y > 14 && y < h - 14) ctx.fillText(String(t), w - 4, y);
    }
  });
  return decalMaterial(`thermometer-${min}-${max}`, map);
}

const RING = new TorusGeometry(0.016, 0.004, 8, 20);
const BORE = new CylinderGeometry(0.0065, 0.0065, 1, 10).translate(0, 0.5, 0);

export function Thermometer3D({ celsius, ghost = null, min = 0, max = 100, height = 0.8, unit = "°C", position }: { celsius: Getter<number>; ghost?: number | null; min?: number; max?: number; height?: number; unit?: string; position?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const column = useRef<Mesh>(null);
  const travel = height - BASE - HEADROOM;
  const shapes = useMemo<{ rod: BufferGeometry; bulb: BufferGeometry; strip: BufferGeometry }>(
    () => ({
      rod: latheGeometry(rodProfile(height), 28),
      bulb: latheGeometry([...corner(0, BULB * 0.78, BULB * 0.72, -Math.PI / 2, 0, 6), [BULB * 0.72, 0.066], [0.0065, BASE + 0.004], [0.0005, BASE + 0.004]], 20),
      strip: new PlaneGeometry(0.03, travel).translate(0, BASE + travel / 2, -0.009),
    }),
    [height, travel],
  );
  useEffect(() => () => Object.values(shapes).forEach((g) => g.dispose()), [shapes]);
  const spirit = useMemo(() => ownMaterial(TONE.spirit, tier, { emissive: TONE.spirit }), [tier]);
  const lcd = useMemo(() => new TextBoard("screen", 0.09, 24), []);
  const ghostLabel = useMemo(() => new TextBoard("ghost", 0.1, 22), []);
  useEffect(() => {
    if (ghost !== null) ghostLabel.set(`Your idea: ${Math.round(ghost)} ${unit}`);
  }, [ghost, ghostLabel, unit]);
  useEffect(
    () => () => {
      ghostLabel.dispose();
      lcd.dispose();
    },
    [ghostLabel, lcd],
  );
  useFrame(() => {
    const c = celsius();
    lcd.set(`${c.toFixed(1)} ${unit}`);
    const k = Math.max(0.02, Math.min(1, (c - min) / (max - min)));
    const m = column.current;
    if (!m) return;
    m.scale.set(1, k * travel, 1);
    // The spirit warms a little as it climbs.
    (m.material as MeshStandardMaterial).emissiveIntensity = 0.12 + k * 0.25;
  });
  return (
    <group position={position}>
      <mesh geometry={shapes.strip} material={scaleMaterial(min, max)} renderOrder={1} />
      <mesh geometry={shapes.bulb} material={spirit} />
      <mesh ref={column} geometry={BORE} material={spirit} position={[0, BASE, 0]} />
      <mesh geometry={shapes.rod} material={kitMaterial("glass", tier)} renderOrder={2} />
      <mesh geometry={RING} position={[0, height + 0.014, 0]} material={kitMaterial("steel", tier)} />
      <primitive object={lcd.sprite} position={[0, height + 0.14, 0]} />
      {ghost !== null && <primitive object={ghostLabel.sprite} position={[0, height + 0.3, 0]} />}
    </group>
  );
}
