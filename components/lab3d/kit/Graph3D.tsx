"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, LinearFilter, SRGBColorSpace, Sprite, SpriteMaterial } from "three";
import type { TimelineFrame } from "@/engine/types";
import { PALETTE as P } from "@/lib/tokens";
import { useStageValues } from "../useStageValues";

/*
 * A live graph floating above the bench (DESIGN.md §8.1 "Visualization
 * tools"): one reading over time on a small glass card in Geist Mono. The
 * real line draws itself as the run plays; after a wrong run the ghost's line
 * (the student's idea) shows dashed in volt beside it. Redraws only when the
 * playback time or the ghost changes.
 */

const W = 512;
const H = 300;
const PAD = { l: 64, r: 22, t: 64, b: 40 };

class GraphCard {
  readonly sprite: Sprite;
  private canvas = document.createElement("canvas");
  private texture: CanvasTexture;
  private lastT = -1;
  private lastGhost: TimelineFrame[] | null | undefined = undefined;

  constructor(
    private label: string,
    private unit: string,
    private digits: number,
    width: number,
  ) {
    this.canvas.width = W;
    this.canvas.height = H;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.minFilter = LinearFilter;
    this.sprite = new Sprite(new SpriteMaterial({ map: this.texture, transparent: true, depthWrite: false, toneMapped: false }));
    this.sprite.scale.set(width, (width * H) / W, 1);
    this.sprite.renderOrder = 9;
    void document.fonts?.load('500 24px "Geist Mono"').then(() => (this.lastT = -1));
  }

  update(key: string, real: TimelineFrame[] | undefined, ghost: TimelineFrame[] | null, t: number, start: number) {
    if (Math.abs(t - this.lastT) < 1 / 30 && ghost === this.lastGhost) return;
    this.lastT = t;
    this.lastGhost = ghost;
    const ctx = this.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.strokeStyle = "rgba(18,18,18,0.08)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(3, 3, W - 6, H - 6, 34);
    ctx.fill();
    ctx.stroke();
    const series = [real, ghost ?? undefined].filter((s): s is TimelineFrame[] => !!s && s.length > 1);
    const values = series.flatMap((s) => s.map((f) => f.values[key] ?? 0));
    if (values.length === 0) values.push(start);
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    const span = Math.max(hi - lo, Math.abs(hi) * 0.02, 0.01);
    lo -= span * 0.15;
    hi += span * 0.15;
    const end = Math.max(1e-6, ...series.map((s) => s[s.length - 1].t));
    const x = (time: number) => PAD.l + (Math.min(time, end) / end) * (W - PAD.l - PAD.r);
    const y = (v: number) => H - PAD.b - ((v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
    // Title and the value right now.
    const now = real && real.length > 1 ? sampleAt(real, key, t) : start;
    ctx.font = '500 24px "Geist Mono", ui-monospace, monospace';
    ctx.fillStyle = P.ink[500];
    ctx.textBaseline = "middle";
    ctx.fillText(this.label, PAD.l - 30, 36);
    ctx.textAlign = "right";
    ctx.fillStyle = P.ink[900];
    ctx.fillText(`${now.toFixed(this.digits)} ${this.unit}`, W - PAD.r, 36);
    ctx.textAlign = "left";
    // Axes.
    ctx.strokeStyle = "rgba(18,18,18,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD.l, PAD.t - 6);
    ctx.lineTo(PAD.l, H - PAD.b);
    ctx.lineTo(W - PAD.r, H - PAD.b);
    ctx.stroke();
    ctx.fillStyle = P.ink[300];
    ctx.font = '500 18px "Geist Mono", ui-monospace, monospace';
    ctx.fillText("time", W - PAD.r - 46, H - PAD.b + 22);
    // The ghost: the student's idea, dashed volt.
    if (ghost && ghost.length > 1) line(ctx, ghost, key, x, y, end, P.volt[500], [12, 10], 5);
    // Reality, drawn up to now; before a run, the starting value as a dot.
    if (real && real.length > 1) {
      line(ctx, real, key, x, y, t, P.apricot[600], [], 6);
      dot(ctx, x(t), y(now), P.apricot[600]);
    } else dot(ctx, x(0), y(start), P.ink[300]);
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
    (this.sprite.material as SpriteMaterial).dispose();
  }
}

function sampleAt(frames: TimelineFrame[], key: string, t: number): number {
  let i = 0;
  while (i < frames.length - 1 && frames[i + 1].t <= t) i++;
  const a = frames[i];
  const b = frames[Math.min(i + 1, frames.length - 1)];
  const k = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
  return (a.values[key] ?? 0) * (1 - k) + (b.values[key] ?? 0) * k;
}

function line(ctx: CanvasRenderingContext2D, frames: TimelineFrame[], key: string, x: (t: number) => number, y: (v: number) => number, until: number, color: string, dash: number[], width: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash(dash);
  ctx.beginPath();
  frames.forEach((f, i) => {
    if (f.t > until) return;
    const px = x(f.t);
    const py = y(f.values[key] ?? 0);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  if (until > 0 && until < frames[frames.length - 1].t) ctx.lineTo(x(until), y(sampleAt(frames, key, until)));
  ctx.stroke();
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, px: number, py: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px, py, 8, 0, Math.PI * 2);
  ctx.fill();
}

/** A live graph of timeline value `value` (e.g. "scale.grams"), `width` world units wide. */
export function Graph3D({ value, label, unit, digits = 1, width = 0.9, position }: { value: string; label: string; unit: string; digits?: number; width?: number; position?: [number, number, number] }) {
  const sv = useStageValues();
  const card = useMemo(() => new GraphCard(label, unit, digits, width), [label, unit, digits, width]);
  useEffect(() => () => card.dispose(), [card]);
  useFrame(() => card.update(value, sv.outcome?.timeline, sv.ghost?.timeline ?? null, sv.t(), sv.now()[value] ?? 0));
  return <primitive object={card.sprite} position={position} />;
}
