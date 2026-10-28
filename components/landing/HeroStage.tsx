"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { Group, PerspectiveCamera as Camera } from "three";
import { scenes } from "@/lib/scroll";
import { PerspectiveCamera, View } from "@react-three/drei";
import { cn } from "@/lib/cn";
import { softClick } from "@/lib/sound";
import { LAB } from "@/lib/tokens";
import { Ano } from "@/components/ano/Ano";
import type { AnoAction } from "@/components/ano/types";
import { useStudioEnvironment } from "@/components/three/studio-env";
import { useViewPresence } from "@/components/three/frameloop";
import { pointer } from "@/components/three/pointer";
import { StageCard, type StageTone } from "@/components/ui/StageCard";
import { BagBench, DropBench, LedBench } from "./stage/benches";
import { LightBeam } from "./stage/particles";

/*
 * The landing hero's stage (DESIGN.md §2 P4, §7.1): the stage card in the
 * slide's lab palette, and on it, in one 3D view, the slide's real
 * experiment, large, as the star (stage/benches.tsx), with Ano floating small
 * off to its side, under a soft beam of light with dust drifting through it. Lit by the slide's lab (Robotics' graphite rig
 * for the LED, Chemistry's teal for the bag and the drop). Ano always wears
 * his happy face here; each slide gives him a move.
 */

export interface StageValue {
  value: number;
  unit: string;
}

/** How big each slide's experiment stands: as large as fits the card (the LED's bench is the widest). */
const BENCH_SCALE: Record<StageTone, number> = { led: 0.98, bag: 1.12, gravity: 1.05 };

const BEAM: Record<StageTone, { color: string; dust: string; glow: boolean }> = {
  led: { color: LAB.robotics.gold, dust: LAB.robotics.gold, glow: true },
  bag: { color: LAB.chemistry.gold, dust: "#ffffff", glow: true },
  gravity: { color: "#ffffff", dust: LAB.chemistry.gold, glow: false },
};

/** The three slides' experiments, built once, each with its own reading; only the slide's one shows. Their shaders are compiled up front. */
function Benches({ tone, values }: { tone: StageTone; values: Partial<Record<StageTone, StageValue>> }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const groups = useRef<Partial<Record<StageTone, Group | null>>>({});
  const shown = useRef(tone);
  useEffect(() => {
    shown.current = tone;
  }, [tone]);
  // Show all three for one compile, so the first change to each slide is as smooth as the rest.
  useEffect(() => {
    const all = Object.values(groups.current).filter((g): g is Group => !!g);
    all.forEach((g) => (g.visible = true));
    void gl.compileAsync(scene, camera).finally(() => all.forEach((g) => (g.visible = g.userData.tone === shown.current)));
  }, [gl, scene, camera]);
  const bench = (t: StageTone, node: React.ReactNode) => (
    <group
      ref={(g) => {
        groups.current[t] = g;
      }}
      userData={{ tone: t }}
      visible={t === tone}
      position={[-0.1, 0, 0.55]}
      scale={BENCH_SCALE[t]}
    >
      {node}
    </group>
  );
  return (
    <>
      {bench("led", <LedBench milliamps={values.led?.value ?? 0} />)}
      {bench("bag", <BagBench grams={values.bag?.value ?? 0} />)}
      {bench("gravity", <DropBench seconds={values.gravity?.value ?? 0} />)}
    </>
  );
}

function Scene({ tone, values, action, track }: { tone: StageTone; values: Partial<Record<StageTone, StageValue>>; action: AnoAction; track: React.RefObject<HTMLElement | null> }) {
  useStudioEnvironment(1.15, tone === "led" ? "robotics" : "chemistry");
  // Highlights sweep across the gloss as the mouse moves (DESIGN.md §9.1).
  useFrame(({ scene }) => {
    const x = pointer.active ? pointer.x / window.innerWidth - 0.5 : 0;
    scene.environmentRotation.y += (x * 0.9 - scene.environmentRotation.y) * 0.06;
  });
  const beam = BEAM[tone];
  const cam = useRef<Camera>(null);
  // The hero's scroll scene dollies the camera in toward the experiment (useHeroScene writes scenes.hero).
  const ano = useRef<Group>(null);
  // Ano's own reactions (keys from 100, so they never clash with a slide's move).
  const [poke, setPoke] = useState<AnoAction | null>(null);
  const hovering = useRef(false);
  const next = (move: AnoAction["move"]) => setPoke((a) => ({ move, key: Math.max(100, (a?.key ?? 100) + 1) }));
  const hoverAno = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.dataset.cursor = "hover";
    if (hovering.current) return;
    hovering.current = true;
    next("nod");
  };
  const leaveAno = () => {
    hovering.current = false;
    delete document.body.dataset.cursor;
  };
  const pokeAno = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    softClick();
    next(poke?.move === "hop" ? "spin" : "hop");
  };
  useFrame(() => {
    const c = cam.current;
    if (!c) return;
    const p = scenes.hero;
    const k = p * p * (3 - 2 * p);
    // Looking down onto the bench a little, so you see the tops of things (the bag's flat top and panel, the board).
    c.position.set(0, 2.1 - 0.5 * k, 4.9 - 1.3 * k);
    c.lookAt(0, 0.6 - 0.15 * k, 0);
    // The experiment is the star: Ano floats small, up and off to the side, and drifts a little closer as the camera moves in.
    ano.current?.position.set(1.02 + 0.06 * k, 0.98 - 0.25 * k, -0.4 + 0.2 * k);
    ano.current?.scale.setScalar(1 - 0.15 * k);
  });
  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={[0, 2.1, 4.9]} fov={28} near={0.1} far={30} onUpdate={(c) => c.lookAt(0, 0.6, 0)} />
      {/* Ano wears his happy face (two even eyes, a centred smile) and follows the cursor; hover and he nods, click and he hops or spins. He drifts aside as the camera moves in. */}
      <group ref={ano} onPointerOver={hoverAno} onPointerOut={leaveAno} onClick={pokeAno}>
        <Ano expression="happy" action={poke ?? action} look="cursor" track={track} scale={0.42} shadow={false} />
      </group>
      {/* The slide's experiment, as large as its card allows, a little left of centre (Ano floats to its right).
          All three stay built and only the slide's one shows, so changing slide never builds a model or compiles a shader mid-animation. */}
      <Benches tone={tone} values={values} />
      <group position={[0, 0, 0.2]}>
        <LightBeam color={beam.color} dust={beam.dust} glow={beam.glow} />
      </group>
    </>
  );
}

export function HeroStage({ tone, values, action, className }: { tone: StageTone; values: Partial<Record<StageTone, StageValue>>; action: AnoAction; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  useViewPresence(track);
  return (
    <div data-hero-stage className={cn("relative", className)}>
      {/* On phones the stage card travels with the stage; on wide screens the hero draws it behind. */}
      <StageCard tone={tone} className="inset-0 rounded-[2rem] md:hidden" />
      <View ref={track} className="absolute inset-0">
        <Scene tone={tone} values={values} action={action} track={track} />
      </View>
    </div>
  );
}
