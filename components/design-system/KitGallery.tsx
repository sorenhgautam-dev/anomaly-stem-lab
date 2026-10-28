"use client";

import { useRef, type ReactNode } from "react";
import { PerspectiveCamera, View } from "@react-three/drei";
import type { LabId } from "@/engine/types";
import { cn } from "@/lib/cn";
import { AnoView } from "@/components/ano/AnoView";
import { useViewPresence } from "@/components/three/frameloop";
import { useLabEnvironment } from "@/components/lab3d/scene/lab-light";
import { ZipBag3D } from "@/components/lab3d/kit/chem/bag";
import { Beaker3D, Flask3D, TestTube3D } from "@/components/lab3d/kit/chem/glass";
import { Scale3D } from "@/components/lab3d/kit/chem/Scale3D";
import { Bulb3D, Led3D } from "@/components/lab3d/kit/circuit/lamps3d";
import { Battery3D, Jumper3D, Resistor3D, Switch3D } from "@/components/lab3d/kit/circuit/parts3d";
import { Wire3D } from "@/components/lab3d/kit/circuit/Wire3D";
import { LAB } from "@/lib/tokens";

/*
 * The 3D kit, one model per cell at close range, on its lab's wall colour
 * and under its lab's light (DESIGN.md §8.2: "the Critic must judge every
 * model at close range"). Dev only, like /design-system. Cameras are fixed
 * three-quarter views, so before-and-after shots line up.
 */

type Cam = { position: [number, number, number]; target: [number, number, number]; fov?: number };

const SLOT = 0.28;
const DARK = { brightness: 0, burnt: false };

function Cell({ id, title, lab, cam, children }: { id: string; title: string; lab: LabId; cam: Cam; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  useViewPresence(track);
  return (
    <figure data-kit={id} className="flex flex-col gap-2">
      <div className={cn("relative aspect-[4/3] overflow-hidden rounded-tile", lab === "chemistry" ? "bg-chem-wall" : "bg-robo-wall")}>
        <View ref={track} className="absolute inset-0">
          <CellScene lab={lab} cam={cam}>
            {children}
          </CellScene>
        </View>
      </div>
      <figcaption className="text-[13px] font-semibold text-ink-700">{title}</figcaption>
    </figure>
  );
}

function CellScene({ lab, cam, children }: { lab: LabId; cam: Cam; children: ReactNode }) {
  useLabEnvironment(lab);
  return (
    <>
      <PerspectiveCamera makeDefault position={cam.position} fov={cam.fov ?? 28} onUpdate={(c) => c.lookAt(...cam.target)} />
      {children}
    </>
  );
}

const near = (target: [number, number, number], d: number): Cam => ({ position: [target[0] + d * 0.62, target[1] + d * 0.5, target[2] + d * 0.8], target });

export function KitGallery() {
  return (
    <section id="kit" className="flex flex-col gap-8">
      <div>
        <h2 className="type-heading text-3xl">Chemistry</h2>
        <p className="mt-1 text-[15px] text-ink-500">On the Chemistry wall ({LAB.chemistry.wall}).</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Cell id="beaker" title="Beaker" lab="chemistry" cam={near([0, 0.3, 0], 2.3)}>
          <Beaker3D level={() => 0.55} color={() => LAB.chemistry.sage} />
        </Cell>
        <Cell id="flask" title="Conical flask" lab="chemistry" cam={near([0, 0.45, 0], 2.6)}>
          <Flask3D level={() => 0.5} color={() => LAB.chemistry.sage} />
        </Cell>
        <Cell id="test-tube" title="Test tube" lab="chemistry" cam={near([0, 0.38, 0], 1.9)}>
          <TestTube3D level={() => 0.45} color={() => LAB.chemistry.sage} />
        </Cell>
        <Cell id="scale" title="Digital scale" lab="chemistry" cam={near([0, 0.12, 0], 2.4)}>
          <Scale3D reading={() => 130} ghost={null} />
        </Cell>
        <Cell id="bag" title="Sealed bag on the scale" lab="chemistry" cam={near([0, 0.3, 0], 3)}>
          <Scale3D reading={() => 130} ghost={null} position={[0, 0, 0.1]} />
          <ZipBag3D inflate={() => 0.35} sealed position={[0, 0.2, 0]}>
            <group position={[-0.15, 0.02, 0.05]}>
              <Beaker3D radius={0.12} height={0.2} level={() => 0.7} color={() => LAB.chemistry.sage} />
            </group>
          </ZipBag3D>
        </Cell>
      </div>
      <div>
        <h2 className="type-heading text-3xl">Robotics</h2>
        <p className="mt-1 text-[15px] text-ink-500">On the Robotics wall ({LAB.robotics.wall}).</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Cell id="battery" title="Battery (3 V)" lab="robotics" cam={near([0, 0.12, 0], 1.1)}>
          <Battery3D half={SLOT} volts={3} />
        </Cell>
        <Cell id="resistor" title="Resistor (100 Ω)" lab="robotics" cam={near([0, 0.1, 0], 0.85)}>
          <Resistor3D half={SLOT} ohms={100} />
        </Cell>
        <Cell id="led" title="LED" lab="robotics" cam={near([0, 0.2, 0], 0.85)}>
          <Led3D half={SLOT} flipped={false} state={DARK} ghost={null} powered={false} />
        </Cell>
        <Cell id="wire" title="Wire" lab="robotics" cam={near([0, 0.1, 0], 1)}>
          <Wire3D points={[{ x: 420, y: 320 }, { x: 500, y: 320 }, { x: 500, y: 270 }, { x: 590, y: 270 }]} added={false} amps={0} powered={false} />
        </Cell>
        <Cell id="jumper" title="Jumper wire" lab="robotics" cam={near([0, 0.1, 0], 0.9)}>
          <Jumper3D half={SLOT} />
        </Cell>
        <Cell id="switch" title="Switch" lab="robotics" cam={near([0, 0.1, 0], 0.9)}>
          <Switch3D half={SLOT} props={{ closed: true }} />
        </Cell>
        <Cell id="bulb" title="Bulb" lab="robotics" cam={near([0, 0.25, 0], 1)}>
          <Bulb3D half={SLOT} state={DARK} ghost={null} powered={false} />
        </Cell>
      </div>
      <div>
        <h2 className="type-heading text-3xl">Ano</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <figure data-kit="ano" className="flex flex-col gap-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-tile bg-chem-wall">
            <AnoView className="absolute inset-0" expression="happy" label="Ano" />
          </div>
          <figcaption className="text-[13px] font-semibold text-ink-700">Ano on the Chemistry wall</figcaption>
        </figure>
        <figure data-kit="ano-robo" className="flex flex-col gap-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-tile bg-robo-wall">
            <AnoView className="absolute inset-0" expression="curious" label="Ano" />
          </div>
          <figcaption className="text-[13px] font-semibold text-ink-700">Ano on the Robotics wall</figcaption>
        </figure>
      </div>
    </section>
  );
}
