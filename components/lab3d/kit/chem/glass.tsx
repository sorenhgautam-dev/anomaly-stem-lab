"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, LatheGeometry, Vector2, type Mesh, type MeshStandardMaterial } from "three";
import { useQuality } from "@/lib/quality";
import { addSpout, canvasTexture, corner, decalMaterial, latheGeometry, MONO, radiusAt, SANS, shellGeometry, type Profile } from "../detail";
import { kitMaterial, ownMaterial } from "../materials";

/*
 * Glassware for the chemistry kit (DESIGN.md §7.5, §8.2): a Griffin beaker
 * (thick base, rounded heel, flared lip pulled into a pouring spout, white
 * graduations), a conical flask and a test tube, each with a translucent
 * liquid whose level and colour can follow the simulator every frame (pass
 * getters). Glass has real wall thickness, so its rim and edges catch the
 * light. Faked glass: gloss, tint and transparency.
 */

export type Getter<T> = () => T;

/** A Griffin beaker's outer profile: a thick flat base, a rounded heel, straight walls, a lip that flares out. */
function beakerProfile(r: number, h: number): Profile {
  const heel = r * 0.13;
  return [[0.001, 0], [r - heel, 0], ...corner(r - heel, heel, heel, -Math.PI / 2, 0).slice(1), [r, h * 0.94], [r * 1.035, h]];
}

/** Printed graduations (white enamel, as on a real beaker), drawn once. */
function graduations() {
  return canvasTexture("beaker-graduations", 256, 512, (ctx, w, hh) => {
    ctx.clearRect(0, 0, w, hh);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineCap = "round";
    // Steps of 25 mL up the wall to 200, numbered every 50, with the capacity printed above them (as on a real Griffin beaker).
    for (let i = 0; i <= 8; i++) {
      const y = hh - 24 - (i / 10) * (hh - 60);
      const major = i % 2 === 0;
      ctx.lineWidth = major ? 7 : 5;
      ctx.beginPath();
      ctx.moveTo(18, y);
      ctx.lineTo(major ? 112 : 70, y);
      ctx.stroke();
      if (major && i > 0) {
        ctx.font = `600 40px ${MONO}`;
        ctx.textBaseline = "middle";
        ctx.fillText(String(i * 25), 124, y);
      }
    }
    ctx.font = `600 34px ${SANS}`;
    ctx.textBaseline = "middle";
    ctx.fillText("250 mL", 20, 40);
  });
}

export function Beaker3D({ radius = 0.32, height = 0.62, level, color, position, children }: { radius?: number; height?: number; level: Getter<number>; color: Getter<string>; position?: [number, number, number]; children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  const wall = Math.max(0.006, radius * 0.045);
  const glass = useMemo(() => {
    const g = shellGeometry(beakerProfile(radius, height), wall, wall * 1.8, 72);
    addSpout(g, height + wall / 2, height * 0.12, 0.42, radius * 0.16);
    return g;
  }, [radius, height, wall]);
  // White graduations on the front-left of the wall (big beakers only; a little cup has none).
  const marks = useMemo(() => (radius >= 0.2 ? new CylinderGeometry(radius + 0.0025, radius + 0.0025, height * 0.66, 24, 1, true, -0.75, 0.9).translate(0, height * 0.47, 0) : null), [radius, height]);
  useEffect(() => () => glass.dispose(), [glass]);
  return (
    <group position={position}>
      <mesh geometry={glass} material={kitMaterial("glass", tier)} renderOrder={1} />
      {marks && <mesh geometry={marks} material={decalMaterial("beaker-graduations", graduations(), 0.9)} renderOrder={2} />}
      <LatheLiquid radius={radius - wall * 1.15} base={wall * 1.8} height={height * 0.93} level={level} color={color} />
      {children}
    </group>
  );
}

/** Liquid that fills a straight-walled vessel, with a rounded bottom that sits in the glass's heel. */
function LatheLiquid({ radius, base, height, level, color }: { radius: number; base: number; height: number; level: Getter<number>; color: Getter<string> }) {
  const tier = useQuality((s) => s.level);
  const geometry = useMemo(() => {
    const heel = radius * 0.1;
    return latheGeometry([[0.001, 0], [radius - heel, 0], ...corner(radius - heel, heel, heel, -Math.PI / 2, 0).slice(1), [radius, 1], [0.001, 1]], 48);
  }, [radius]);
  const material = useMemo(() => ownMaterial("#ffffff", tier, { transparent: true, opacity: 0.82 }), [tier]);
  const mesh = useRef<Mesh>(null);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const l = Math.max(0.001, Math.min(1, level()));
    m.scale.set(1, l * height, 1);
    m.visible = l > 0.002;
    (m.material as MeshStandardMaterial).color.set(color());
    m.rotation.z = Math.sin(state.clock.elapsedTime * 1.7) * 0.01;
  });
  return <mesh ref={mesh} geometry={geometry} material={material} position={[0, base, 0]} />;
}

/**
 * A liquid that fills a lathed vessel up to a level, following the inside
 * wall exactly (a cone's slope, a round bottom). The lathe's points are
 * rewritten in place, only when the level moves.
 */
const SAMPLES = 14;
const SEGMENTS = 40;
function VesselLiquid({ inner, bottom, top, level, color }: { inner: (y: number) => number; bottom: number; top: number; level: Getter<number>; color: Getter<string> }) {
  const tier = useQuality((s) => s.level);
  const geometry = useMemo(() => new LatheGeometry(Array.from({ length: SAMPLES + 2 }, () => new Vector2(0.001, 0)), SEGMENTS), []);
  const material = useMemo(() => ownMaterial("#ffffff", tier, { transparent: true, opacity: 0.82 }), [tier]);
  const shown = useRef(-1);
  const mesh = useRef<Mesh>(null);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    (m.material as MeshStandardMaterial).color.set(color());
    const l = Math.max(0, Math.min(1, level()));
    m.visible = l > 0.002;
    if (Math.abs(l - shown.current) < 1e-4) return;
    shown.current = l;
    const h = bottom + (top - bottom) * Math.max(0.01, l);
    const profile: [number, number][] = [[0.0005, bottom]];
    for (let j = 0; j < SAMPLES; j++) {
      const y = bottom + ((h - bottom) * j) / (SAMPLES - 1);
      profile.push([Math.max(0.0005, inner(y)), y]);
    }
    profile.push([0.0005, h]);
    // Through the mesh, not the memoised geometry: rewritten in place each time the level moves.
    const g = m.geometry;
    const p = g.attributes.position;
    for (let i = 0; i <= SEGMENTS; i++) {
      const phi = (i / SEGMENTS) * Math.PI * 2;
      for (let j = 0; j < profile.length; j++) p.setXYZ(i * profile.length + j, profile[j][0] * Math.sin(phi), profile[j][1], profile[j][0] * Math.cos(phi));
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
  });
  return <mesh ref={mesh} geometry={geometry} material={material} renderOrder={1} />;
}

/** A conical (Erlenmeyer) flask: rounded heel, straight cone, a soft shoulder into the neck, a beaded rim. */
const FLASK: Profile = [
  [0, 0],
  ...corner(0.38, 0.06, 0.06, -Math.PI / 2, 0).slice(0, -1),
  [0.44, 0.06],
  [0.17, 0.6],
  [0.148, 0.64],
  [0.135, 0.67],
  [0.13, 0.71],
  [0.13, 1.02],
  [0.142, 1.034],
];
const FLASK_WALL = 0.014;

export function Flask3D({ scale = 1, level, color, position, children }: { scale?: number; level: Getter<number>; color: Getter<string>; position?: [number, number, number]; children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  const glass = useMemo(() => shellGeometry(FLASK, FLASK_WALL, FLASK_WALL * 1.8, 64), []);
  return (
    <group position={position} scale={scale}>
      <mesh geometry={glass} material={kitMaterial("glass", tier)} renderOrder={2} />
      {/* Full (level 1) fills the cone to 0.4, as before. */}
      <VesselLiquid inner={(y) => radiusAt(FLASK, y) - FLASK_WALL * 1.15} bottom={FLASK_WALL * 1.9} top={0.4} level={level} color={color} />
      {children}
    </group>
  );
}

/** A test tube: a round bottom, straight walls and a flared lip. */
const TUBE_R = 0.075;
const TUBE_WALL = 0.006;
const TUBE: Profile = [...corner(0, TUBE_R, TUBE_R, -Math.PI / 2, 0, 10), [TUBE_R, 0.75], [TUBE_R + 0.008, 0.765]];

function tubeInner(y: number): number {
  const r = TUBE_R - TUBE_WALL;
  return y < TUBE_R ? Math.sqrt(Math.max(0, r * r - (TUBE_R - y) ** 2)) : r;
}

export function TestTube3D({ level, color, position, tilt = 0 }: { level: Getter<number>; color: Getter<string>; position?: [number, number, number]; tilt?: number }) {
  const tier = useQuality((s) => s.level);
  const glass = useMemo(() => shellGeometry(TUBE, TUBE_WALL, TUBE_WALL * 1.6, 40), []);
  return (
    <group position={position} rotation={[0, 0, tilt]}>
      <mesh geometry={glass} material={kitMaterial("glass", tier)} renderOrder={2} />
      <VesselLiquid inner={tubeInner} bottom={TUBE_WALL + 0.002} top={0.69} level={level} color={color} />
    </group>
  );
}
