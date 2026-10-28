"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Camera, type Group } from "three";
import { useLab, verdictShown } from "@/lib/store";
import { useVoice } from "@/lib/voice";
import { Ano } from "@/components/ano/Ano";
import type { AnoExpression, AnoMove } from "@/components/ano/types";
import { anchor, labView } from "../lab-state";
import type { Shot, StageShots } from "../shots";
import { useShotName } from "./useShotName";

/*
 * Ano in the lab (DESIGN.md §6, §8.1): floats in and waves on arrival, waits
 * by his speech bubble, thinks while the run plays, nods and
 * celebrates on a correct prediction, hops in surprise on an ANOMALY and
 * floats over to the part that matters, then comes back. Publishes where he
 * is on screen so the speech bubble (DOM) can sit beside him.
 */

const FOV = (32 * Math.PI) / 180;
const UP = new Vector3(0, 1, 0);
const v = new Vector3();

/**
 * Ano's home in a camera shot (DESIGN.md §7.5 "bottom left: Ano with speech
 * bubble"). On wide screens he stands in the gap between the mission card and
 * his bubble (measured from the HUD, so he fits however tall they are), his
 * feet just behind the bubble's top edge. On smaller screens the lab is a box
 * above the panels and he waits in its lower right corner. Worked out from
 * the shot (not the live camera), so Ano stays put while the student orbits;
 * when the shot changes he glides to his spot in the new one.
 */
// Ano at scale 1: about 1.95 world units from feet to ear tips, with his
// origin about 15% of that below his visual middle (measured on screen).
const ANO_HEIGHT = 1.95;
const ORIGIN_DROP = 0.15;
/** How far beside and below a part Ano floats when he flies to it, in screen units (2 = the view's width or height). */
const BESIDE = 0.12;
const BELOW = 0.25;

function hudGap(height: number): { x: number; centre: number; size: number } {
  const mission = document.querySelector("[data-lab-mission]")?.getBoundingClientRect();
  const dock = document.querySelector("[data-lab-ano-dock]")?.getBoundingClientRect();
  const top = (mission?.bottom ?? height * 0.45) + 20;
  const bottom = (dock?.top ?? height - 200) + 28;
  const size = Math.max(110, Math.min(200, bottom - top));
  return { x: dock ? dock.left + dock.width / 2 : 184, centre: bottom - size / 2, size };
}

function homeFor(shot: Shot, width: number, height: number): { home: Vector3; entry: Vector3; scale: number } {
  const pos = new Vector3(...shot.position);
  const fwd = new Vector3(...shot.target).sub(pos);
  const depth = fwd.length() * 0.72;
  fwd.normalize();
  const right = new Vector3().crossVectors(fwd, UP).normalize();
  const up = new Vector3().crossVectors(right, fwd);
  const h = depth * Math.tan(FOV / 2);
  const aspect = width / Math.max(1, height);
  const perPx = (2 * h) / height; // world units per screen pixel at this depth
  // Screen spot in normalised coordinates and Ano's height in pixels.
  const wide = width >= 1024;
  // Narrow views (the HUD is below the stage): top left, over the wall, clear of the readouts each stage puts low and in front and of the lamp at the board's right end.
  const gap = wide ? hudGap(height) : { x: width * 0.13, centre: height * 0.18, size: Math.min(110, height * 0.22) };
  // The camera fits the picture above the dock (labView.frame: zoom s, offset ox, oy): place Ano where, after that, he lands in his gap at his size.
  const { s, ox, oy } = labView.frame;
  const gx = s * (gap.x + ox);
  const gy = s * (gap.centre + gap.size * ORIGIN_DROP + oy);
  const x = (2 * gx) / width - 1;
  const y = 1 - (2 * gy) / height;
  const home = pos.addScaledVector(fwd, depth).addScaledVector(right, x * h * aspect).addScaledVector(up, y * h);
  return { home, entry: home.clone().addScaledVector(right, -h * 0.8).addScaledVector(up, h * 1.1), scale: (gap.size * s * perPx) / ANO_HEIGHT };
}

/** Where Ano is flying and when to come home: one object, stepped each frame. */
class Flight {
  pos = new Vector3();
  target = new Vector3();
  home = new Vector3();
  scale = 0.38;
  until = 0;
  private placed = false;
  private away = false;
  private screen = new Vector3();

  setHome(home: Vector3, entry: Vector3, scale: number) {
    this.home.copy(home);
    this.scale = scale;
    // First placement: start off to the side and float in.
    if (!this.placed) this.pos.copy(entry);
    this.placed = true;
  }

  step(group: Group, dt: number, now: number, el: HTMLElement | null, camera: Camera) {
    // While he's away pointing something out, his bubble (in the dock) drops its tail: it would point at empty space.
    const away = now <= this.until;
    if (away !== this.away) {
      this.away = away;
      document.querySelector("[data-lab-ano-dock]")?.toggleAttribute("data-away", away);
    }
    if (now > this.until) this.target.copy(this.home);
    this.pos.lerp(this.target, 1 - Math.exp(-dt * 2.2));
    group.position.copy(this.pos);
    group.scale.setScalar(this.scale);
    // The speech bubble follows Ano's head on screen.
    const r = el?.getBoundingClientRect();
    if (!r) return;
    this.screen.copy(this.pos).add(v.set(0, 0.55, 0)).project(camera);
    labView.anoScreen = { x: r.left + ((this.screen.x + 1) / 2) * r.width, y: r.top + ((1 - this.screen.y) / 2) * r.height, visible: this.screen.z < 1 };
  }

  /** Come straight home (e.g. the camera is diving in where he was hovering). */
  cancel() {
    this.until = 0;
  }

  /**
   * Float to just below a part on screen and off to its outer side (away
   * from the middle of the shot, where the rest of the apparatus is), nearer
   * the camera: the part's label is above it and its ghost to its left, so
   * this corner is the one left free. Kept inside the clear middle
   * (`middle`, in screen units from the centre; the HUD cards cover the
   * edges).
   */
  flyTo(at: Vector3, seconds: number, now: number, camera: Camera, middle: number, spot: Vector3 | null) {
    // A stage may name the spot itself ("ano" anchor), where its layout leaves room.
    if (spot) {
      this.target.copy(spot);
      this.until = now + seconds;
      return;
    }
    const p = this.screen.copy(at).project(camera);
    const side = p.x >= 0 ? 1 : -1;
    const x = Math.max(-middle, Math.min(middle, p.x + side * BESIDE));
    const depth = v.copy(at).lerp(camera.position, 0.18).project(camera).z;
    this.target.set(x, p.y - BELOW, depth).unproject(camera);
    this.until = now + seconds;
  }
}

export function LabAno({ track, shots }: { track: React.RefObject<HTMLElement | null>; shots: StageShots }) {
  const phase = useLab((s) => s.phase);
  const ano = useLab((s) => s.ano);
  const runId = useLab((s) => s.runId);
  const verdict = useLab(verdictShown);
  const speaking = useVoice((s) => s.speaking !== null);
  const group = useRef<Group>(null);
  const [flight] = useState(() => new Flight());
  const flown = useRef(-1);
  const pointed = useRef(labView.point);
  // Inside the particle dive Ano waits where he was in the build shot.
  const name = useShotName(shots);
  const shot = shots[name === "particles" ? "build" : name];
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);

  // Re-homed when the shot, the view's size or the camera's lift changes; Ano glides there.
  const homedFrame = useRef(labView.frame);
  useEffect(() => {
    homedFrame.current = labView.frame;
    const { home, entry, scale } = homeFor(shot, width, height);
    flight.setHome(home, entry, scale);
  }, [shot, width, height, flight]);
  useFrame(() => {
    const f = labView.frame;
    const was = homedFrame.current;
    if (Math.abs(f.s - was.s) < 0.01 && Math.abs(f.oy - was.oy) < 4) return;
    homedFrame.current = f;
    const { home, entry, scale } = homeFor(shot, width, height);
    flight.setHome(home, entry, scale);
  });

  const expression: AnoExpression = phase === "running" ? "thinking" : verdict === "correct" ? "celebrating" : verdict === "wrong" ? "surprised" : ano === "stuck" ? "thinking" : ano === "greet" ? "happy" : "curious";
  const move: AnoMove | null = phase === "result" && verdict ? (verdict === "correct" ? "nod" : "hop") : phase === "build" && ano === "greet" ? "wave" : null;

  useFrame(({ camera, clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const now = clock.elapsedTime;
    // On an ANOMALY, once per run, fly to the part the diagnosis points at.
    if (verdict === "wrong" && flown.current !== runId) {
      flown.current = runId;
      // He flies only where the stage names a spot clear of its apparatus ("ano" anchor, e.g. the circuits);
      // elsewhere, and on narrow views, he points the result out from his corner rather than cover it.
      const spot = labView.anchors.get("ano");
      if (width >= 1024 && spot) flight.flyTo(anchor(labView.focus), 3.4, now, camera, 0.34, spot);
    }
    // The replay stopped at the moment the student's idea split off: point at it again.
    if (labView.point !== pointed.current) {
      pointed.current = labView.point;
      const spot = labView.anchors.get("ano");
      if (width >= 1024 && spot) flight.flyTo(anchor(labView.focus), 3.4, now, camera, 0.34, spot);
    }
    if (name === "particles") flight.cancel();
    flight.step(g, Math.min(delta, 1 / 30), now, labView.el, camera);
  });

  return (
    <group ref={group}>
      <Ano track={track} expression={expression} action={move ? { move, key: runId * 10 + (move === "wave" ? 0 : 1) } : null} speaking={speaking} look="cursor" shadow={false} />
    </group>
  );
}
