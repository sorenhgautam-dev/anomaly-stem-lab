"use client";

import { useMemo, type ReactNode } from "react";
import { RoundedBox } from "@react-three/drei";
import { CylinderGeometry, TorusGeometry } from "three";
import { useQuality } from "@/lib/quality";
import { LAB } from "@/lib/tokens";
import { kitMaterial } from "./materials";

/*
 * The cancer labs' apparatus, built in code to the model standard (DESIGN.md
 * §8 "model quality"): real proportions, bevelled and rounded parts, small
 * details (knobs, screws, bezels, printed labels) and the kit's PBR
 * materials (glossy white plastic, black trim, brushed steel, the lab's
 * accent), with no tiny printed text (it reads as cheap up close). Each is
 * one clear object a 12-year-old recognises: a microscope,
 * a ring scanner with its couch, a UV meter on a tripod and a treatment
 * machine with its gantry, head and couch. Sizes are in metres-ish world
 * units, around a 1 m bench.
 */

/** A compound light microscope: foot, curved arm, stage with slide clips, nosepiece with three objectives, eyepiece tube, focus knobs, lamp. */
export function Microscope3D({ children }: { children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  const white = kitMaterial("plastic", tier);
  const black = kitMaterial("black", tier);
  const steel = kitMaterial("steel", tier);
  const knob = useMemo(() => new CylinderGeometry(0.045, 0.045, 0.03, 32).rotateZ(Math.PI / 2), []);
  return (
    <group>
      {/* Foot */}
      <RoundedBox args={[0.42, 0.06, 0.5]} radius={0.025} smoothness={4} position={[0, 0.03, 0]} material={white} />
      {/* The lamp in the foot, glowing up through the stage */}
      <mesh position={[0, 0.065, 0.06]}>
        <cylinderGeometry args={[0.045, 0.05, 0.012, 32]} />
        <meshStandardMaterial color="#FFF6DD" emissive="#FFE9B0" emissiveIntensity={0.8} />
      </mesh>
      {/* Arm: a column rising at the back, then leaning forward over the stage */}
      <RoundedBox args={[0.1, 0.5, 0.12]} radius={0.035} smoothness={4} position={[0, 0.31, -0.17]} material={white} />
      <RoundedBox args={[0.1, 0.1, 0.24]} radius={0.035} smoothness={4} position={[0, 0.56, -0.08]} rotation={[0.35, 0, 0]} material={white} />
      {/* Focus knobs, both sides */}
      <mesh geometry={knob} position={[0.075, 0.22, -0.17]} material={black} />
      <mesh geometry={knob} position={[-0.075, 0.22, -0.17]} material={black} />
      {/* Stage: a black square with steel clips, holding a slide */}
      <RoundedBox args={[0.3, 0.025, 0.26]} radius={0.01} smoothness={3} position={[0, 0.2, 0.05]} material={black} />
      <RoundedBox args={[0.035, 0.008, 0.12]} radius={0.003} smoothness={2} position={[-0.09, 0.218, 0.05]} material={steel} />
      <RoundedBox args={[0.035, 0.008, 0.12]} radius={0.003} smoothness={2} position={[0.09, 0.218, 0.05]} material={steel} />
      <group position={[0, 0.216, 0.05]}>{children}</group>
      {/* Nosepiece with three objectives pointing down at the slide */}
      <mesh position={[0, 0.42, 0.05]} material={steel}>
        <cylinderGeometry args={[0.06, 0.07, 0.04, 32]} />
      </mesh>
      {[0, 2.1, 4.2].map((a) => (
        <mesh key={a} position={[Math.sin(a) * 0.035, 0.37, 0.05 + Math.cos(a) * 0.035]} material={a === 0 ? black : steel}>
          <cylinderGeometry args={[0.014, 0.018, 0.07, 20]} />
        </mesh>
      ))}
      {/* Body tube and binocular eyepieces, angled up toward the viewer */}
      <mesh position={[0, 0.52, 0.03]} rotation={[-0.45, 0, 0]} material={white}>
        <cylinderGeometry args={[0.04, 0.045, 0.16, 32]} />
      </mesh>
      {[-0.035, 0.035].map((x) => (
        <mesh key={x} position={[x, 0.63, 0.09]} rotation={[-0.45, 0, 0]} material={black}>
          <cylinderGeometry args={[0.017, 0.019, 0.1, 24]} />
        </mesh>
      ))}
    </group>
  );
}

/** A ring scanner: a thick rounded gantry with a bore, a teal light strip, a front display and a couch through the middle. */
export function Scanner3D({ children }: { children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  const white = kitMaterial("plastic", tier);
  const black = kitMaterial("black", tier);
  const gantry = useMemo(() => new TorusGeometry(0.42, 0.14, 32, 96), []);
  const bore = useMemo(() => new CylinderGeometry(0.29, 0.29, 0.3, 64, 1, true).rotateX(Math.PI / 2), []);
  const strip = useMemo(() => new TorusGeometry(0.3, 0.006, 8, 96), []);
  return (
    <group>
      {/* The gantry stands on a broad foot */}
      <RoundedBox args={[1.0, 0.12, 0.36]} radius={0.04} smoothness={4} position={[0, 0.06, 0]} material={white} />
      <group position={[0, 0.6, 0]}>
        <mesh geometry={gantry} scale={[1, 1, 1.25]} material={white} />
        <mesh geometry={bore} material={kitMaterial("satin", tier, "#DCDDDA")} />
        <mesh geometry={strip} position={[0, 0, 0.17]}>
          <meshBasicMaterial color={LAB.robotics.teal} toneMapped={false} />
        </mesh>
        {/* The front display, top right of the ring */}
        <RoundedBox args={[0.2, 0.11, 0.02]} radius={0.012} smoothness={3} position={[0.3, 0.36, 0.17]} rotation={[0, 0, -0.55]} material={black} />
        <group>{children}</group>
      </group>
      {/* The couch slides through the bore: a long rounded top on a pedestal, with a soft sage mattress */}
      <RoundedBox args={[0.22, 0.3, 0.22]} radius={0.04} smoothness={4} position={[0, 0.15, 0.75]} material={white} />
      <RoundedBox args={[0.34, 0.05, 1.3]} radius={0.02} smoothness={3} position={[0, 0.33, 0.45]} material={white} />
      <RoundedBox args={[0.3, 0.025, 1.24]} radius={0.012} smoothness={3} position={[0, 0.365, 0.45]} material={kitMaterial("satin", tier, LAB.chemistry.sage)} />
    </group>
  );
}

/** A UV meter on a tripod: a rounded handset with a white sensor dome, a bezel round a teal screen, two buttons and a printed "UV" label. */
export function UvMeter3D({ children }: { children?: ReactNode }) {
  const tier = useQuality((s) => s.level);
  const steel = kitMaterial("steel", tier);
  const body = kitMaterial("satin", tier, "#F4F1EA");
  const black = kitMaterial("black", tier);
  return (
    <group>
      {/* Tripod */}
      {[0, 2.1, 4.2].map((a) => (
        <mesh key={a} position={[Math.sin(a) * 0.09, 0.2, Math.cos(a) * 0.09]} rotation={[Math.cos(a) * 0.32, 0, -Math.sin(a) * 0.32]} material={steel}>
          <cylinderGeometry args={[0.009, 0.009, 0.42, 10]} />
        </mesh>
      ))}
      <mesh position={[0, 0.48, 0]} material={steel}>
        <cylinderGeometry args={[0.015, 0.015, 0.2, 12]} />
      </mesh>
      {/* Handset */}
      <group position={[0, 0.72, 0]}>
        <RoundedBox args={[0.3, 0.38, 0.09]} radius={0.04} smoothness={5} material={body} />
        <mesh position={[0, 0.215, 0]} material={kitMaterial("plastic", tier)}>
          <sphereGeometry args={[0.045, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <RoundedBox args={[0.24, 0.16, 0.012]} radius={0.015} smoothness={3} position={[0, 0.06, 0.047]} material={black} />
        <RoundedBox args={[0.2, 0.12, 0.006]} radius={0.01} smoothness={3} position={[0, 0.06, 0.054]} material={kitMaterial("satin", tier, LAB.prevention.teal)} />
        {children}
        {[-0.05, 0.05].map((x) => (
          <mesh key={x} position={[x, -0.09, 0.048]} rotation={[Math.PI / 2, 0, 0]} material={kitMaterial("satin", tier, LAB.prevention.sage)}>
            <cylinderGeometry args={[0.022, 0.022, 0.012, 24]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** A radiotherapy machine: a stand, a gantry arm that reaches over the couch, the head with its round collimator, and the couch. */
export function TreatmentMachine3D() {
  const tier = useQuality((s) => s.level);
  const white = kitMaterial("plastic", tier);
  const black = kitMaterial("black", tier);
  return (
    <group>
      {/* Stand and the rotating disc the gantry hangs from */}
      <RoundedBox args={[0.5, 0.95, 0.46]} radius={0.06} smoothness={4} position={[-0.55, 0.475, -0.1]} material={white} />
      <mesh position={[-0.3, 0.68, -0.1]} rotation={[0, 0, Math.PI / 2]} material={kitMaterial("satin", tier, "#E7E7E4")}>
        <cylinderGeometry args={[0.24, 0.24, 0.06, 64]} />
      </mesh>
      {/* Gantry arm reaching out over the couch, and the head pointing down */}
      <RoundedBox args={[0.7, 0.2, 0.3]} radius={0.07} smoothness={4} position={[0.02, 0.92, -0.1]} material={white} />
      <RoundedBox args={[0.3, 0.24, 0.32]} radius={0.07} smoothness={4} position={[0.25, 0.8, -0.1]} material={white} />
      <mesh position={[0.25, 0.66, -0.1]} material={black}>
        <cylinderGeometry args={[0.1, 0.12, 0.05, 48]} />
      </mesh>
      <mesh position={[0.25, 0.632, -0.1]}>
        <cylinderGeometry args={[0.06, 0.06, 0.006, 32]} />
        <meshBasicMaterial color={LAB.robotics.gold} toneMapped={false} />
      </mesh>
      <RoundedBox args={[0.02, 0.06, 0.2]} radius={0.008} smoothness={2} position={[0.4, 0.92, -0.1]} material={kitMaterial("gold", tier)} />
      {/* The couch */}
      <RoundedBox args={[0.2, 0.3, 0.2]} radius={0.04} smoothness={4} position={[0.25, 0.15, 0.25]} material={white} />
      <RoundedBox args={[0.32, 0.05, 1.0]} radius={0.02} smoothness={3} position={[0.25, 0.33, 0.1]} material={white} />
      <RoundedBox args={[0.28, 0.025, 0.95]} radius={0.012} smoothness={3} position={[0.25, 0.365, 0.1]} material={kitMaterial("satin", tier, LAB.robotics.teal)} />
    </group>
  );
}
