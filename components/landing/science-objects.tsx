"use client";

import { createContext, useContext, useMemo, useRef, type FC, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Merged } from "@react-three/drei";
import { Mesh, type Group } from "three";
import { TOKENS } from "@/lib/tokens";
import { geos } from "./geometries";
import { mats } from "./materials";

/*
 * The floating science objects (CLAUDE.md §3.1.2), each centred on its own
 * origin at roughly unit size so physics colliders line up.
 *
 * Every part is an instance: one draw call per part type for all ~30 objects
 * instead of one per mesh (CLAUDE.md §9: under 150 draw calls). Wrap the
 * objects in <ScienceParts> and they pull their parts from context.
 */

export type ObjectKind = "atom" | "beaker" | "flask" | "gear" | "bulb" | "robot";

function partMeshes() {
  const g = geos();
  const m = mats();
  return {
    // Colour variants share one instanced mesh via per-instance colour.
    nucleon: new Mesh(g.nucleon, m.plastic),
    orbit: new Mesh(g.orbit, m.chrome),
    electron: new Mesh(g.electron, m.glowLilac),
    beaker: new Mesh(g.beaker, m.glass),
    beakerLiquid: new Mesh(g.beakerLiquid, m.liquid),
    flask: new Mesh(g.flask, m.glass),
    flaskLiquid: new Mesh(g.flaskLiquid, m.liquid),
    gear: new Mesh(g.gear, m.plastic),
    bulbGlass: new Mesh(g.bulbGlass, m.glass),
    bulbMetal: new Mesh(g.bulbMetal, m.chrome),
    filament: new Mesh(g.filament, m.glowGold),
    robotBody: new Mesh(g.robotBody, m.plastic),
    robotHead: new Mesh(g.robotHead, m.pearl),
    robotVisor: new Mesh(g.robotVisor, m.dark),
    robotEye: new Mesh(g.robotEye, m.glowLilac),
    wheel: new Mesh(g.wheel, m.signal),
    antenna: new Mesh(g.antenna, m.chrome),
    antennaTip: new Mesh(g.antennaTip, m.glowSignal),
  };
}

type PartName = keyof ReturnType<typeof partMeshes>;
type PartProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  /** Per-instance colour, for parts made of the white "plastic" material. */
  color?: string;
};

const WHITE = TOKENS.pearl;
const BLUE = TOKENS.signal;
const BLACK = TOKENS.void;
type Parts = Record<PartName, FC<PartProps>>;

const PartsContext = createContext<Parts | null>(null);

function useParts(): Parts {
  const parts = useContext(PartsContext);
  if (!parts) throw new Error("Science objects must be rendered inside <ScienceParts>");
  return parts;
}

/** Provides instanced parts to every science object rendered inside it. */
export function ScienceParts({ limit, children }: { limit: number; children: ReactNode }) {
  const meshes = useMemo(() => partMeshes(), []);
  return (
    <Merged meshes={meshes} limit={limit} frustumCulled={false}>
      {(models) => <PartsContext.Provider value={models as unknown as Parts}>{children}</PartsContext.Provider>}
    </Merged>
  );
}

const ORBIT_TILTS = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

export function Atom({ seed }: { seed: number }) {
  const P = useParts();
  const pivots = useRef<(Group | null)[]>([]);
  useFrame((_, delta) => {
    pivots.current.forEach((pivot, i) => {
      if (pivot) pivot.rotation.z += delta * (1.6 + i * 0.45 + seed * 0.3);
    });
  });
  return (
    <group>
      <P.nucleon position={[0.06, 0.05, 0.03]} color={BLUE} />
      <P.nucleon position={[-0.07, 0.04, -0.03]} color={WHITE} />
      <P.nucleon position={[0.02, -0.08, 0.05]} color={WHITE} />
      <P.nucleon position={[-0.01, -0.01, -0.09]} color={BLUE} />
      {ORBIT_TILTS.map((yaw, i) => (
        <group key={yaw} rotation={[1.2, yaw, 0, "YXZ"]}>
          <P.orbit />
          <group
            ref={(el) => {
              pivots.current[i] = el;
            }}
            rotation={[0, 0, seed * 6 + i * 2]}
          >
            <P.electron position={[0.6, 0, 0]} />
          </group>
        </group>
      ))}
    </group>
  );
}

export function Beaker() {
  const P = useParts();
  return (
    <group>
      <P.beaker />
      <P.beakerLiquid position={[0, -0.19, 0]} />
    </group>
  );
}

export function Flask() {
  const P = useParts();
  return (
    <group>
      <P.flask />
      <P.flaskLiquid />
    </group>
  );
}

export function Gear({ seed }: { seed: number }) {
  const P = useParts();
  return <P.gear color={seed > 0.5 ? BLACK : WHITE} />;
}

export function Bulb() {
  const P = useParts();
  return (
    <group position={[0, -0.04, 0]}>
      <P.bulbGlass />
      <P.bulbMetal />
      <P.filament position={[0, 0.26, 0]} />
    </group>
  );
}

export function Robot({ seed }: { seed: number }) {
  const P = useParts();
  return (
    <group position={[0, -0.2, 0]}>
      <P.robotBody color={seed > 0.6 ? BLACK : WHITE} />
      <P.robotHead position={[0, 0.43, 0]} />
      <P.robotVisor position={[0, 0.44, 0.18]} />
      <P.robotEye position={[-0.08, 0.44, 0.205]} />
      <P.robotEye position={[0.08, 0.44, 0.205]} />
      <P.wheel position={[-0.31, -0.22, 0]} rotation={[0, 0, Math.PI / 2]} />
      <P.wheel position={[0.31, -0.22, 0]} rotation={[0, 0, Math.PI / 2]} />
      <P.antenna position={[0, 0.67, 0]} />
      <P.antennaTip position={[0, 0.77, 0]} />
    </group>
  );
}

export function ScienceObject({ kind, seed }: { kind: ObjectKind; seed: number }) {
  switch (kind) {
    case "atom":
      return <Atom seed={seed} />;
    case "beaker":
      return <Beaker />;
    case "flask":
      return <Flask />;
    case "gear":
      return <Gear seed={seed} />;
    case "bulb":
      return <Bulb />;
    case "robot":
      return <Robot seed={seed} />;
  }
}
