import { PALETTE as P } from "@/lib/tokens";
import type { Bounds, FxWorld } from "@/lib/fx/world";

/*
 * The soft cursor (DESIGN.md §9.1): an ink dot with a thin white edge that
 * sits exactly on the pointer (so aiming stays precise) and leaves a tiny warm
 * trail. Over anything clickable a ring grows round it; a press squashes it
 * and the release sends out a small ripple. Normal blending, so it reads on
 * the cream theme and on dark scenes alike. Replaces the system cursor on
 * mouse devices (globals.css).
 */

/** Points along the trail. */
const LINKS = 9;
/** How fast each link chases the one ahead (1/s). Higher = shorter tail. */
const FOLLOW = 46;

const ease = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);

export class SoftCursor {
  x = 0;
  y = 0;
  /** Pointer is inside the window and over something the custom cursor draws on. */
  shown = false;
  /** Over a link, button or slider. */
  hovering = false;
  pressed = false;
  private pts = new Float32Array(LINKS * 2);
  private placed = false;
  private fade = 0;
  private hover = 0;
  private press = 0;
  private speed = 0;
  private lastX = 0;
  private lastY = 0;

  constructor(private world: FxWorld) {}

  move(x: number, y: number) {
    this.x = x;
    this.y = y;
    if (!this.placed) {
      for (let i = 0; i < LINKS; i++) {
        this.pts[i * 2] = x;
        this.pts[i * 2 + 1] = y;
      }
      this.lastX = x;
      this.lastY = y;
      this.placed = true;
    }
  }

  /** A click: a ripple and a pinch of confetti-coloured dots. */
  release() {
    this.world.ring({ x: this.x, y: this.y, from: 8, to: 34, life: 0.45, color: P.flame[400], width: 1.6 });
    this.world.burst({ x: this.x, y: this.y, count: 6, kind: "glow", colors: [P.apricot[500], P.flame[400], P.volt[400]], speed: [60, 140], life: [0.22, 0.4], size: [2, 3], drag: 7 });
  }

  /** Advance one frame. Returns false once everything has settled. */
  step(dt: number): boolean {
    const p = this.pts;
    const k = ease(dt, FOLLOW);
    p[0] = this.x;
    p[1] = this.y;
    let spread = 0;
    for (let i = 1; i < LINKS; i++) {
      p[i * 2] += (p[i * 2 - 2] - p[i * 2]) * k;
      p[i * 2 + 1] += (p[i * 2 - 1] - p[i * 2 + 1]) * k;
      spread += Math.abs(p[i * 2] - this.x) + Math.abs(p[i * 2 + 1] - this.y);
    }
    if (dt > 0) {
      const instant = Math.hypot(this.x - this.lastX, this.y - this.lastY) / dt;
      this.speed += (instant - this.speed) * ease(dt, 14);
    }
    this.lastX = this.x;
    this.lastY = this.y;
    this.fade += ((this.shown ? 1 : 0) - this.fade) * ease(dt, 12);
    this.hover += ((this.hovering ? 1 : 0) - this.hover) * ease(dt, 14);
    this.press += ((this.pressed ? 1 : 0) - this.press) * ease(dt, 26);
    const settling =
      Math.abs(this.fade - (this.shown ? 1 : 0)) > 0.01 ||
      Math.abs(this.hover - (this.hovering ? 1 : 0)) > 0.01 ||
      Math.abs(this.press - (this.pressed ? 1 : 0)) > 0.01;
    return spread > 0.5 || this.speed > 2 || settling;
  }

  draw(ctx: CanvasRenderingContext2D, bounds: Bounds) {
    if (this.fade < 0.01 || !this.placed) return;
    ctx.globalCompositeOperation = "source-over";
    this.drawTrail(ctx, bounds);
    this.drawRing(ctx, bounds);
    this.drawDot(ctx, bounds);
    ctx.globalAlpha = 1;
  }

  private drawTrail(ctx: CanvasRenderingContext2D, bounds: Bounds) {
    const p = this.pts;
    const tailX = p[(LINKS - 1) * 2];
    const tailY = p[(LINKS - 1) * 2 + 1];
    if (Math.hypot(tailX - this.x, tailY - this.y) < 4) return;
    const g = ctx.createLinearGradient(this.x, this.y, tailX, tailY);
    g.addColorStop(0, P.apricot[500]);
    g.addColorStop(0.6, P.flame[400]);
    g.addColorStop(1, `${P.flame[300]}00`);
    ctx.strokeStyle = g;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Tapers from the dot to the tail: draw each link a little thinner.
    for (let i = 1; i < LINKS; i++) {
      ctx.globalAlpha = 0.5 * this.fade * (1 - this.hover * 0.6);
      ctx.lineWidth = 5 * (1 - i / LINKS);
      ctx.beginPath();
      ctx.moveTo(p[i * 2 - 2], p[i * 2 - 1]);
      ctx.lineTo(p[i * 2], p[i * 2 + 1]);
      ctx.stroke();
      bounds.add(p[i * 2], p[i * 2 + 1], 6);
    }
  }

  private drawRing(ctx: CanvasRenderingContext2D, bounds: Bounds) {
    if (this.hover < 0.02) return;
    const r = (6 + this.hover * 16) * (1 - this.press * 0.18);
    ctx.globalAlpha = 0.22 * this.hover * this.fade;
    ctx.fillStyle = P.apricot[300];
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85 * this.hover * this.fade;
    ctx.strokeStyle = P.ink[900];
    ctx.lineWidth = 1.5;
    ctx.stroke();
    bounds.add(this.x, this.y, r + 4);
  }

  private drawDot(ctx: CanvasRenderingContext2D, bounds: Bounds) {
    const r = 4.2 * (1 - this.hover * 0.45) * (1 - this.press * 0.3);
    ctx.globalAlpha = this.fade;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r + 1.4, 0, Math.PI * 2);
    ctx.fillStyle = P.white;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = P.ink[900];
    ctx.fill();
    bounds.add(this.x, this.y, 30);
  }
}
