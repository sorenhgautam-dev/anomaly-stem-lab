"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import { MeshPhysicalMaterial, SphereGeometry, type Mesh } from "three";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { FitModel } from "@/components/three/FitModel";
import { Inspectable } from "@/components/three/Inspectable";
import { GasCloud, ZipBag3D } from "@/components/lab3d/kit/chem/bag";
import { Beaker3D } from "@/components/lab3d/kit/chem/glass";
import { Scale3D } from "@/components/lab3d/kit/chem/Scale3D";
import { Led3D } from "@/components/lab3d/kit/circuit/lamps3d";
import { Battery3D, Resistor3D } from "@/components/lab3d/kit/circuit/parts3d";
import { canvasTexture, decalMaterial, MONO } from "@/components/lab3d/kit/detail";
import { kitMaterial } from "@/components/lab3d/kit/materials";
import { Cable3D } from "@/components/lab3d/kit/robot/Cable3D";
import { Multimeter3D } from "@/components/lab3d/kit/robot/Multimeter3D";
import { ballHeight, DROP, landingTime } from "../drop-sim";
import { Puffs } from "./particles";

/*
 * The real experiment on the landing hero's stage, one per slide, built from
 * the lab kit (DESIGN.md §8.2) and showing the value the slide's cards show
 * (the same engine run, featured.ts):
 *  - LedBench: the backwards LED in series with the resistor and battery,
 *    dark, and a multimeter reading the 0 mA through it.
 *  - BagBench: the sealed bag on the scale, puffed with CO₂, the scale
 *    reading the same mass as before.
 *  - DropBench: the steel and glass balls falling side by side and landing
 *    together, again and again, with a puff of dust where each one lands.
 * Each stands on a short plinth at y = 0, centred, about 1.8 wide.
 */

const DARK = { brightness: 0, burnt: false };
/** Circuit parts stand on the board's top (y 0.07): the board here is the plinth's top. */
const HALF = 0.3;

export function LedBench({ milliamps }: { milliamps: number }) {
  const tier = useQuality((s) => s.level);
  const y = 0.07;
  return (
    <group>
      <RoundedBox args={[2.1, 0.12, 0.9]} radius={0.04} smoothness={3} position={[0, 0.01, 0]} material={kitMaterial("matte", tier, LAB.robotics.bench)} />
      <RoundedBox args={[2.16, 0.07, 0.96]} radius={0.03} smoothness={3} position={[0, -0.075, 0]} material={kitMaterial("matte", tier, LAB.robotics.trim)} />
      <group position={[-0.62, 0, 0.12]}>
        <Inspectable name="Battery" values={() => "2 × AA · 3.0 V"} height={0.2}>
          <Battery3D half={HALF} volts={3} />
        </Inspectable>
      </group>
      <group position={[0, 0, 0.12]}>
        <Inspectable name="Resistor" values={() => "220 Ω"} height={0.2}>
          <Resistor3D half={HALF} ohms={220} />
        </Inspectable>
      </group>
      <group position={[0.62, 0, 0.12]}>
        <Inspectable name="LED, backwards" values={() => `dark · ${milliamps.toFixed(1)} mA`} height={0.4}>
          <Led3D half={HALF} flipped state={DARK} ghost={null} powered />
        </Inspectable>
      </group>
      {/* The loop closes behind: LED back to the battery. */}
      <Cable3D points={[[0.92, y, 0.12], [1.0, y, -0.2], [-1.0, y, -0.2], [-0.92, y, 0.12]]} />
      <group position={[0.86, 0.06, -0.26]} rotation={[0, -0.45, 0]} scale={0.9}>
        <Inspectable name="Multimeter" values={() => `${milliamps.toFixed(1)} mA through the LED`} height={0.6}>
          <Multimeter3D reading={() => milliamps.toFixed(1)} unit="mA" />
        </Inspectable>
      </group>
      <ContactShadows frames={1} position={[0, 0.072, 0]} scale={[2.2, 1]} far={0.6} blur={2} opacity={0.4} color={LAB.robotics.deep} resolution={256} />
    </group>
  );
}

export function BagBench({ grams }: { grams: number }) {
  const tier = useQuality((s) => s.level);
  return (
    <group>
      <RoundedBox args={[2, 0.12, 1.1]} radius={0.05} smoothness={3} position={[0, -0.06, 0]} material={kitMaterial("satin", tier, LAB.chemistry.bench)} />
      <Inspectable name="Sealed bag on a scale" values={() => `${grams.toFixed(1)} g · the same as before`} height={1.08}>
      <FitModel width={1.7} height={1.02}>
        <group>
          <Scale3D reading={() => grams} ghost={null} />
          <ZipBag3D inflate={() => 0.62} sealed position={[0, 0.2, 0]}>
            <group position={[-0.18, 0.02, 0.06]}>
              <Beaker3D radius={0.12} height={0.2} level={() => 0.35} color={() => LAB.chemistry.sage} />
            </group>
            {/* The CO₂ the reaction made, trapped and bouncing round the bag. */}
            <GasCloud position={[0, 0.24, 0]} size={0.011} count={() => 46} radii={() => [0.46, 0.17, 0.3]} color={LAB.chemistry.gold} />
          </ZipBag3D>
        </group>
      </FitModel>
      </Inspectable>
      <ContactShadows frames={1} position={[0, 0.002, 0]} scale={[2.1, 1.2]} far={0.6} blur={2} opacity={0.35} color={LAB.chemistry.floor} resolution={256} />
    </group>
  );
}

/** The drop timer's LCD: when both balls touched the pad, in gold digits on a dark glass. */
function timerScreen(seconds: number) {
  return canvasTexture(`drop-timer-${seconds}`, 256, 96, (ctx, w, h) => {
    ctx.fillStyle = "#14191a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = LAB.chemistry.gold;
    ctx.font = `600 54px ${MONO}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(`${seconds.toFixed(2)} s`, w - 16, h / 2 + 4);
    ctx.font = `600 16px ${MONO}`;
    ctx.textAlign = "left";
    ctx.fillText("BOTH", 14, 26);
  });
}

/** A small drop timer on the pad: a bevelled black case, a gold-edged LCD reading the landing time. */
function DropTimer({ seconds }: { seconds: number }) {
  const tier = useQuality((s) => s.level);
  const screen = useMemo(() => decalMaterial(`drop-timer-${seconds}`, timerScreen(seconds)), [seconds]);
  return (
    <group>
      <RoundedBox args={[0.42, 0.18, 0.2]} radius={0.04} smoothness={4} position={[0, 0.09, 0]} material={kitMaterial("black", tier)} />
      <RoundedBox args={[0.36, 0.11, 0.01]} radius={0.004} smoothness={2} position={[0, 0.1, 0.101]} material={kitMaterial("gold", tier)} />
      <mesh position={[0, 0.1, 0.107]} material={screen}>
        <planeGeometry args={[0.34, 0.095]} />
      </mesh>
    </group>
  );
}

const BALL = new SphereGeometry(DROP.radius, 48, 32);
/** One fall, the bounces and a beat of rest, then they're back at the top. */
const CYCLE = landingTime(DROP.g) + 2.2;
/** Where the two balls hang, either side of the middle. */
const X = 0.62;
/** Scene units in the drop model to stage units. */
const K = 0.55;

export function DropBench({ seconds }: { seconds: number }) {
  const tier = useQuality((s) => s.level);
  const mats = useMemo(
    () => ({
      steel: new MeshPhysicalMaterial({ color: "#d9dde4", metalness: 0.9, roughness: 0.34, clearcoat: 0.6 }),
      glass: new MeshPhysicalMaterial({ color: LAB.chemistry.sage, transparent: true, opacity: tier === "low" ? 0.6 : 0.5, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.05 }),
    }),
    [tier],
  );
  const steel = useRef<Mesh>(null);
  const glass = useRef<Mesh>(null);
  const landed = useRef(-1);
  const puffs = useRef<{ fire: (x: number) => void } | null>(null);
  const floor = (DROP.floorY - DROP.floorY) * K;
  useFrame(({ clock }) => {
    const cycle = Math.floor(clock.elapsedTime / CYCLE);
    const t = clock.elapsedTime - cycle * CYCLE;
    // Mass isn't in it: both balls follow the same fall.
    const yS = (ballHeight(t, DROP.g, DROP.restitution.steel) - DROP.floorY) * K + DROP.radius * K;
    const yG = (ballHeight(t, DROP.g, DROP.restitution.glass) - DROP.floorY) * K + DROP.radius * K;
    if (steel.current) steel.current.position.y = yS;
    if (glass.current) glass.current.position.y = yG;
    if (t >= landingTime(DROP.g) && landed.current !== cycle) {
      landed.current = cycle;
      puffs.current?.fire(-X);
      puffs.current?.fire(X);
    }
  });
  return (
    <group>
      <RoundedBox args={[1.95, 0.1, 0.8]} radius={0.04} smoothness={3} position={[0, -0.05 + floor, 0]} material={kitMaterial("satin", tier, LAB.chemistry.bench)} />
      <RoundedBox args={[2.01, 0.05, 0.86]} radius={0.02} smoothness={2} position={[0, -0.12 + floor, 0]} material={kitMaterial("sand", tier)} />
      <Inspectable name="Steel ball" values={() => `4.1 kg · lands at ${seconds.toFixed(2)} s`} height={1.45}>
        <mesh ref={steel} geometry={BALL} material={mats.steel} position={[-X, 1, 0]} scale={K} />
      </Inspectable>
      <Inspectable name="Glass ball" values={() => `1.3 kg · lands at ${seconds.toFixed(2)} s`} height={1.45}>
        <mesh ref={glass} geometry={BALL} material={mats.glass} position={[X, 1, 0]} scale={K} />
      </Inspectable>
      <Puffs ref={puffs} y={floor + 0.01} color={LAB.chemistry.bench} />
      <group position={[0.74, floor, 0.3]} rotation={[0, -0.45, 0]}>
        <Inspectable name="Drop timer" values={() => `both balls land at ${seconds.toFixed(2)} s`} height={0.22}>
          <DropTimer seconds={seconds} />
        </Inspectable>
      </group>
      <ContactShadows frames={1} position={[0, 0.002 + floor, 0]} scale={[2, 1]} far={1.2} blur={2.4} opacity={0.3} color={LAB.chemistry.floor} resolution={256} />
    </group>
  );
}
