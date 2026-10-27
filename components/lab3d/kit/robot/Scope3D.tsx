"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CanvasTexture, CylinderGeometry, SRGBColorSpace } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useQuality } from "@/lib/quality";
import { PALETTE as P } from "@/lib/tokens";
import { kitMaterial } from "../materials";
import type { Getter } from "../chem/glass";

/*
 * A toy oscilloscope (DESIGN.md §7.5, §8.1 "live 3D graphs floating above
 * the bench"): a white body with a dark screen that draws the supply's pulse
 * train in Geist Mono and apricot. The real switching is far too fast to
 * see, so the trace runs slowed down and says so. Before a run it previews
 * the duty cycle; during a run it scrolls with the clock and, once the motor
 * runs, a dashed line marks the average voltage.
 */

const W = 640;
const H = 360;
const PLOT = { x0: 40, x1: 600, yOn: 112, yOff: 268 };
/** Seconds of (slowed) signal across the screen. */
const WINDOW = 1.5;
/** Two knobs beside the screen, merged into one mesh. */
const KNOBS = mergeGeometries([0.44, 0.22].map((y) => new CylinderGeometry(0.035, 0.035, 0.04, 18).rotateX(Math.PI / 2).translate(0.41, y, 0.18)));

class ScopeScreen {
  readonly texture: CanvasTexture;
  private canvas = document.createElement("canvas");
  private last = "";
  constructor(
    private hz: number,
    private displayHz: number,
    private supply: number,
  ) {
    this.canvas.width = W;
    this.canvas.height = H;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    void document.fonts?.load('500 26px "Geist Mono"').then(() => (this.last = ""));
  }

  /** `duty` 0–1, `t` seconds into the run (0 before it), `average` volts to mark (or null). */
  draw(duty: number, t: number, average: number | null): void {
    const key = `${duty}|${t.toFixed(3)}|${average}`;
    if (key === this.last) return;
    this.last = key;
    const ctx = this.canvas.getContext("2d")!;
    ctx.fillStyle = P.ink[900];
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = P.ink[700];
    ctx.lineWidth = 2;
    for (let i = 0; i <= 10; i++) line(ctx, PLOT.x0 + ((PLOT.x1 - PLOT.x0) * i) / 10, 70, PLOT.x0 + ((PLOT.x1 - PLOT.x0) * i) / 10, 300);
    for (let j = 0; j <= 4; j++) line(ctx, PLOT.x0, 70 + j * 57.5, PLOT.x1, 70 + j * 57.5);
    // The square wave: a still preview before a run, scrolling (newest on the right) during one.
    const from = t > 0 ? Math.max(0, t - WINDOW) : 0;
    const to = t > 0 ? t : WINDOW;
    const x = (tau: number) => (t > 0 ? PLOT.x1 - ((t - tau) / WINDOW) * (PLOT.x1 - PLOT.x0) : PLOT.x0 + (tau / WINDOW) * (PLOT.x1 - PLOT.x0));
    const level = (tau: number) => (duty >= 1 ? 1 : duty <= 0 ? 0 : (tau * this.displayHz) % 1 < duty ? 1 : 0);
    const y = (on: number) => (on ? PLOT.yOn : PLOT.yOff);
    ctx.strokeStyle = P.apricot[300];
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x(from), y(level(from)));
    const step = 1 / this.displayHz;
    for (let k = Math.floor(from * this.displayHz); k <= Math.ceil(to * this.displayHz); k++) {
      for (const [at, on] of [[k * step, 1], [(k + duty) * step, 0]] as const) {
        if (at <= from || at >= to || duty <= 0 || duty >= 1) continue;
        ctx.lineTo(x(at), y(on ? 0 : 1));
        ctx.lineTo(x(at), y(on));
      }
    }
    ctx.lineTo(x(to), y(level(to)));
    ctx.stroke();
    ctx.font = '500 26px "Geist Mono", ui-monospace, monospace';
    ctx.textBaseline = "middle";
    ctx.fillStyle = P.cream[100];
    ctx.textAlign = "left";
    ctx.fillText(`PWM ${this.hz >= 1000 ? `${this.hz / 1000} kHz` : `${this.hz} Hz`} · duty ${Math.round(duty * 100)} %`, PLOT.x0, 36);
    ctx.fillStyle = P.ink[300];
    ctx.textAlign = "right";
    ctx.fillText(`shown ${Math.round(this.hz / this.displayHz)}× slower`, PLOT.x1, 332);
    ctx.textAlign = "left";
    ctx.fillText(`${this.supply} V`, PLOT.x0, 332);
    if (average !== null) {
      const ya = PLOT.yOff - (average / this.supply) * (PLOT.yOff - PLOT.yOn);
      ctx.strokeStyle = P.cream[100];
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 10]);
      line(ctx, PLOT.x0, ya, PLOT.x1, ya);
      ctx.setLineDash([]);
      ctx.fillStyle = P.cream[100];
      ctx.textAlign = "right";
      ctx.fillText(`avg ${average.toFixed(1)} V`, PLOT.x1 - 6, ya - 18);
    }
    this.texture.needsUpdate = true;
  }
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

export function Scope3D({ duty, t, average, hz, displayHz, supply, position, rotation }: { duty: number; t: Getter<number>; average: Getter<number | null>; hz: number; displayHz: number; supply: number; position?: [number, number, number]; rotation?: [number, number, number] }) {
  const tier = useQuality((s) => s.level);
  const screen = useMemo(() => new ScopeScreen(hz, displayHz, supply), [hz, displayHz, supply]);
  useEffect(() => () => screen.texture.dispose(), [screen]);
  useFrame(() => screen.draw(duty, t(), average()));
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[1.0, 0.62, 0.34]} radius={0.06} smoothness={3} position={[0, 0.31, 0]} material={kitMaterial("plastic", tier)} />
      <RoundedBox args={[0.78, 0.47, 0.03]} radius={0.03} smoothness={2} position={[-0.07, 0.33, 0.165]} material={kitMaterial("ink", tier)} />
      <mesh position={[-0.07, 0.33, 0.182]}>
        <planeGeometry args={[0.72, 0.405]} />
        <meshBasicMaterial map={screen.texture} toneMapped={false} />
      </mesh>
      <mesh geometry={KNOBS} material={kitMaterial("orange", tier)} />
    </group>
  );
}
