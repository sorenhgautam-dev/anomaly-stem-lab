"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, RoundedBox } from "@react-three/drei";
import { MeshPhysicalMaterial, MeshStandardMaterial, RingGeometry, SphereGeometry, type Group, type Mesh } from "three";
import { glassClink, metalThud } from "@/lib/sound";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { Ano } from "@/components/ano/Ano";
import { useStudioEnvironment } from "@/components/three/studio-env";
import { ballHeight, DROP, ghostFor, landingTime } from "./drop-sim";
import { useDrop } from "./drop-store";

/*
 * "Which falls faster?" in 3D (CLAUDE.md §3.2): a steel and a glass ball on a
 * ledge that swings open, a floor, and, after a wrong guess, a ghost of the
 * student's belief falling faster beside reality. Ano watches from the side.
 * Positions come from drop-sim.ts; the clock is the store's startedAt.
 */

const X = { steel: -0.62, glass: 0.62 };
const BALL = new SphereGeometry(DROP.radius, 48, 32);
const RING = new RingGeometry(0.28, 0.34, 48).rotateX(-Math.PI / 2);

export function DropScene({ track }: { track: React.RefObject<HTMLElement | null> }) {
  useStudioEnvironment(1.15);
  const high = useQuality((s) => s.level === "high");
  const phase = useDrop((s) => s.phase);
  const guess = useDrop((s) => s.guess);
  const ghost = phase === "dropping" || phase === "result" ? (guess ? ghostFor(guess) : null) : null;

  const mats = useMemo(
    () => ({
      steel: new MeshPhysicalMaterial({ color: "#d9dde4", metalness: 1, roughness: 0.2, clearcoat: 0.6 }),
      // Glass faked with gloss, tint and transparency: real transmission over
      // the transparent site canvas reads as flat white.
      glass: new MeshPhysicalMaterial({ color: P.volt[100], transparent: true, opacity: high ? 0.42 : 0.55, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 1 }),
      ghost: new MeshStandardMaterial({ color: P.volt[300], emissive: P.volt[400], emissiveIntensity: 0.35, transparent: true, opacity: 0.38, depthWrite: false }),
      floor: new MeshPhysicalMaterial({ color: P.cream[100], roughness: 0.55, clearcoat: 0.3 }),
      ledge: new MeshPhysicalMaterial({ color: P.white, roughness: 0.3, clearcoat: 0.8 }),
      dust: new MeshStandardMaterial({ color: P.apricot[300], transparent: true, opacity: 0, depthWrite: false }),
    }),
    [high],
  );

  const steel = useRef<Mesh>(null);
  const glass = useRef<Mesh>(null);
  const ghostMesh = useRef<Mesh>(null);
  const ledgeL = useRef<Group>(null);
  const ledgeR = useRef<Group>(null);
  const dust = useRef<Mesh[]>([]);
  const sounded = useRef(0);

  useFrame(() => {
    const s = useDrop.getState();
    const live = s.phase === "dropping" || s.phase === "result";
    const t = live ? (performance.now() - s.startedAt) / 1000 : 0;
    const land = landingTime(DROP.g);
    if (steel.current) steel.current.position.y = live ? ballHeight(t, DROP.g, DROP.restitution.steel) : DROP.startY;
    if (glass.current) glass.current.position.y = live ? ballHeight(t, DROP.g, DROP.restitution.glass) : DROP.startY;
    if (ghostMesh.current) ghostMesh.current.position.y = live ? ballHeight(t, DROP.g * DROP.ghostGravityFactor, 0.3) : DROP.startY;
    // The ledge swings open in the first moment of the drop.
    const open = live ? Math.min(1, t / 0.18) : 0;
    // Trapdoors: each plate swings down from its outer hinge.
    if (ledgeL.current) ledgeL.current.rotation.z = -open * 1.25;
    if (ledgeR.current) ledgeR.current.rotation.z = open * 1.25;
    // Two thuds at the same moment, and a ring of dust under each ball.
    if (live && t >= land && sounded.current !== s.dropId) {
      sounded.current = s.dropId;
      metalThud(1);
      glassClink(0.8, 0.9);
    }
    const k = live && t >= land ? (t - land) / 0.55 : 1;
    for (const ring of dust.current) {
      ring.scale.setScalar(1 + k * 2.4);
      (ring.material as MeshStandardMaterial).opacity = k < 1 ? 0.55 * (1 - k) : 0;
    }
  });

  const floorTop = DROP.floorY - DROP.radius;
  const ledgeY = DROP.startY - DROP.radius - 0.05;
  const lookTarget = 0.05;
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.2, 8]} fov={30} onUpdate={(c) => c.lookAt(0, lookTarget, 0)} />
      <mesh ref={steel} geometry={BALL} material={mats.steel} position={[X.steel, DROP.startY, 0]} />
      <mesh ref={glass} geometry={BALL} material={mats.glass} position={[X.glass, DROP.startY, 0]} />
      {ghost && <mesh ref={ghostMesh} geometry={BALL} material={mats.ghost} position={[X[ghost] + (ghost === "steel" ? -0.08 : 0.08), DROP.startY, -0.45]} />}
      {/* The ledge: two hinged plates under the balls. */}
      <group ref={ledgeL} position={[-1.08, ledgeY, 0]}>
        <RoundedBox args={[1.06, 0.08, 0.7]} radius={0.04} position={[0.53, 0, 0]} material={mats.ledge} />
      </group>
      <group ref={ledgeR} position={[1.08, ledgeY, 0]}>
        <RoundedBox args={[1.06, 0.08, 0.7]} radius={0.04} position={[-0.53, 0, 0]} material={mats.ledge} />
      </group>
      <RoundedBox args={[3.2, 0.16, 1.4]} radius={0.07} position={[0, floorTop - 0.08, 0]} material={mats.floor} />
      {[X.steel, X.glass].map((x, i) => (
        <mesh
          key={x}
          ref={(m) => {
            if (m) dust.current[i] = m;
          }}
          geometry={RING}
          material={i === 0 ? mats.dust : mats.dust.clone()}
          position={[x, floorTop + 0.01, 0]}
        />
      ))}
      <group position={[1.42, floorTop + 0.5, 0.25]} rotation={[0, -0.55, 0]}>
        <Ano track={track} scale={0.42} expression={phase === "result" ? (guess && ghostFor(guess) ? "surprised" : "celebrating") : phase === "dropping" ? "thinking" : "curious"} />
      </group>
    </>
  );
}
