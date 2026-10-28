"use client";

import type { ReactNode } from "react";
import { Bulb3D, Led3D } from "@/components/lab3d/kit/circuit/lamps3d";
import { Battery3D, Jumper3D, Resistor3D, Switch3D } from "@/components/lab3d/kit/circuit/parts3d";
import { ZipBag3D } from "@/components/lab3d/kit/chem/bag";
import { Beaker3D, Flask3D, TestTube3D } from "@/components/lab3d/kit/chem/glass";
import { Scale3D } from "@/components/lab3d/kit/chem/Scale3D";
import { Thermometer3D } from "@/components/lab3d/kit/chem/instruments";
import { Balloon3D } from "@/components/lab3d/kit/chem/heat/Balloon3D";
import { SealedTube3D } from "@/components/lab3d/kit/chem/react/gas-tube";
import { Jar3D, SteelWool3D } from "@/components/lab3d/kit/chem/react/burn-parts";
import { Syringe3D } from "@/components/lab3d/kit/chem/gas/Syringe";
import { Gear3D } from "@/components/lab3d/kit/robot/Gear3D";
import { MotorCan3D } from "@/components/lab3d/kit/robot/MotorCan3D";
import { RobotChassis3D } from "@/components/lab3d/kit/robot/RobotChassis3D";
import { LAB, PALETTE as P } from "@/lib/tokens";

/*
 * One real piece of apparatus from the lab kit for each experiment, for the
 * level select's shelf: the experiment's own model where it has one (the
 * sealed bag on its scale, the LED, the gear), otherwise the glassware it
 * uses. LevelShelf.tsx fits each to its slot, so sizes here are the kit's own.
 * Liquids use each lab's colours; the indicator's purple and NO₂'s brown are
 * the experiments' data.
 */

const DARK = { brightness: 0, burnt: false };
const HALF = 0.22;
const still = () => 0;
/** Circuit parts are drawn standing on the board's top; this sinks them to the shelf. */
const onBoard = (part: ReactNode) => <group position={[0, -0.07, 0]}>{part}</group>;

const MODELS: Record<string, () => ReactNode> = {
  "chemistry-dissolving": () => <Beaker3D level={() => 0.62} color={() => "#eef3f1"} />,
  "chemistry-indicator": () => <TestTube3D level={() => 0.55} color={() => P.grape[400]} />,
  "chemistry-melting": () => <Thermometer3D celsius={() => 4} height={0.7} />,
  "chemistry-sealed-bag": () => (
    <group>
      <Scale3D reading={() => 130} ghost={null} width={1.1} />
      <ZipBag3D inflate={() => 0.4} sealed position={[0, 0.2, 0]} />
    </group>
  ),
  "chemistry-burning": () => (
    <Jar3D sealed>
      <SteelWool3D oxide={() => 0.3} glow={still} />
    </Jar3D>
  ),
  "chemistry-gas-heat": () => (
    <Flask3D scale={0.6} level={() => 0.35} color={() => LAB.chemistry.sage}>
      <Balloon3D radius={0.2} swell={() => 0.5} position={[0, 1.08, 0]} />
    </Flask3D>
  ),
  "chemistry-neutralisation": () => <Flask3D scale={0.62} level={() => 0.7} color={() => LAB.chemistry.sage} />,
  "chemistry-reaction-speed": () => <Beaker3D level={() => 0.7} color={() => LAB.chemistry.gold} />,
  "chemistry-catalyst": () => <Flask3D scale={0.62} level={() => 0.5} color={() => "#eef3f1"} />,
  "chemistry-equilibrium": () => <SealedTube3D share={() => 0.55} />,
  "chemistry-gas-laws": () => <Syringe3D volume={() => 0.6} />,
  "robotics-light-bulb": () => onBoard(<Bulb3D half={HALF} state={DARK} ghost={null} powered={false} />),
  "robotics-switches": () => onBoard(<Switch3D half={HALF} props={{ closed: false }} />),
  "robotics-series": () => onBoard(<Bulb3D half={HALF} state={DARK} ghost={null} powered={false} />),
  "robotics-parallel": () => onBoard(<Battery3D half={HALF} volts={3} />),
  "robotics-led": () => onBoard(<Led3D half={HALF} flipped={false} state={DARK} ghost={null} powered={false} />),
  "robotics-shortcut": () => onBoard(<Jumper3D half={HALF} />),
  "robotics-ohms-law": () => onBoard(<Resistor3D half={HALF} ohms={220} />),
  "robotics-steering": () => <RobotChassis3D track={0.5} wheelRadius={0.12} left={0} right={0} />,
  "robotics-gears": () => <Gear3D teeth={18} angle={still} />,
  "robotics-pwm": () => <MotorCan3D />,
};

/** The model for an experiment (a plain beaker if it has none yet). */
export function shelfModel(id: string): ReactNode {
  return (MODELS[id] ?? (() => <Beaker3D level={() => 0.5} color={() => LAB.chemistry.sage} />))();
}
