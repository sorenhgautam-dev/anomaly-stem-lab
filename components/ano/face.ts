import { CanvasTexture, SRGBColorSpace } from "three";
import { PALETTE as P } from "@/lib/tokens";
import type { AnoExpression } from "./types";

/*
 * Ano's face (DESIGN.md §6): glowing apricot eyes and mouth drawn on a small
 * canvas, used as the visor's emissive map. Redrawn only when something
 * visible changes (expression, a blink, the eyes moving, talk bars).
 */

export const FACE_W = 256;
export const FACE_H = 136;

export interface FaceState {
  expression: AnoExpression;
  /** 0 open … 1 shut. */
  blink: number;
  /** Where the eyes look, −1..1 each way. */
  lookX: number;
  lookY: number;
  /** Talk bar heights 0..1, or null when not speaking. */
  talk: number[] | null;
}

const EYE_DX = 46;
const EYE_Y = 58;
const MOUTH_Y = 100;

function star(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

function eyes(ctx: CanvasRenderingContext2D, f: FaceState) {
  const cx = FACE_W / 2 + f.lookX * 7;
  const cy = EYE_Y + f.lookY * 5;
  for (const side of [-1, 1]) {
    const x = cx + side * EYE_DX;
    if (f.blink > 0.6 && f.expression !== "celebrating") {
      ctx.beginPath();
      ctx.moveTo(x - 14, cy + 2);
      ctx.lineTo(x + 14, cy + 2);
      ctx.stroke();
      continue;
    }
    const open = 1 - f.blink;
    switch (f.expression) {
      case "happy":
        ctx.beginPath();
        ctx.arc(x, cy + 10, 15, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        break;
      case "curious":
        ctx.beginPath();
        ctx.ellipse(x, cy, 12, 15 * open, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "thinking":
        ctx.beginPath();
        ctx.ellipse(x + 5, cy - 9, 11, 12 * open, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "surprised":
        ctx.beginPath();
        ctx.arc(x, cy, 17 * Math.max(0.3, open), 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, cy, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "celebrating":
        star(ctx, x, cy, 19, 8);
        break;
    }
  }
}

function mouth(ctx: CanvasRenderingContext2D, f: FaceState) {
  const cx = FACE_W / 2 + f.lookX * 4;
  if (f.talk) {
    f.talk.forEach((h, i) => {
      const height = 6 + h * 22;
      const x = cx + (i - (f.talk!.length - 1) / 2) * 12;
      ctx.beginPath();
      ctx.roundRect(x - 3.5, MOUTH_Y - height / 2, 7, height, 3.5);
      ctx.fill();
    });
    return;
  }
  ctx.beginPath();
  switch (f.expression) {
    case "happy":
      ctx.arc(cx, MOUTH_Y - 14, 20, Math.PI * 0.18, Math.PI * 0.82);
      ctx.stroke();
      break;
    case "curious":
      ctx.arc(cx, MOUTH_Y, 6.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "thinking":
      ctx.moveTo(cx - 6, MOUTH_Y + 2);
      ctx.lineTo(cx + 20, MOUTH_Y - 2);
      ctx.stroke();
      break;
    case "surprised":
      ctx.ellipse(cx, MOUTH_Y, 10, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "celebrating":
      ctx.moveTo(cx - 24, MOUTH_Y - 8);
      ctx.arc(cx, MOUTH_Y - 8, 24, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      break;
  }
}

export class Face {
  readonly canvas: HTMLCanvasElement;
  readonly texture: CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private last = "";

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = FACE_W;
    this.canvas.height = FACE_H;
    this.ctx = this.canvas.getContext("2d")!;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.anisotropy = 4;
  }

  /** Draw the face; skipped when nothing visible changed. */
  draw(f: FaceState): void {
    const key = `${f.expression}|${f.blink > 0.6 ? 1 : f.blink > 0.2 ? 0.5 : 0}|${Math.round(f.lookX * 3)}|${Math.round(f.lookY * 3)}|${f.talk?.map((h) => Math.round(h * 4)).join("") ?? ""}`;
    if (key === this.last) return;
    this.last = key;
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, FACE_W, FACE_H);
    ctx.strokeStyle = ctx.fillStyle = P.apricot[400];
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = P.apricot[400];
    ctx.shadowBlur = 14;
    eyes(ctx, f);
    mouth(ctx, f);
    ctx.shadowBlur = 0;
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
