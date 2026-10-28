import { PALETTE as P } from "@/lib/tokens";
import type { Bounds, FxWorld } from "@/lib/fx/world";

/*
 * The soft cursor (DESIGN.md §9.1): a clear arrow pointer, ink with a white
 * edge, its tip exactly on the pointer (so aiming stays precise and it never
 * reads as a stray dot), leaving a tiny trail. Over anything clickable a ring
 * grows round the tip; a press squashes the arrow and the release sends out a
 * small ripple. Normal blending, so it reads on paper and on dark scenes
 * alike. Gold and ink only (orange is Ano's). Replaces the system cursor on
 * mouse devices (globals.css).
 */

/** The arrow's outline, tip at (0, 0), in CSS pixels (a classic pointer, about 23 px tall). */
const ARROW: [number, number][] = [[0, 0], [0, 19.5], [5.2, 15.1], [8.7, 22.8], [11.9, 21.4], [8.5, 13.9], [14.4, 13.9]];

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

  /** A click: one gold ripple, like a drop landing on paper. */
  release() {
    this.world.ring({ x: this.x, y: this.y, from: 8, to: 34, life: 0.45, color: P.ink[700], width: 1.6 });
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
    this.drawArrow(ctx, bounds);
    ctx.globalAlpha = 1;
  }

  private drawTrail(ctx: CanvasRenderingContext2D, bounds: Bounds) {
    const p = this.pts;
    const tailX = p[(LINKS - 1) * 2];
    const tailY = p[(LINKS - 1) * 2 + 1];
    if (Math.hypot(tailX - this.x, tailY - this.y) < 4) return;
    const g = ctx.createLinearGradient(this.x, this.y, tailX, tailY);
    g.addColorStop(0, P.ink[700]);
    g.addColorStop(0.6, `${P.ink[500]}99`);
    g.addColorStop(1, `${P.ink[300]}00`);
    ctx.strokeStyle = g;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Tapers from the dot to the tail: draw each link a little thinner.
    for (let i = 1; i < LINKS; i++) {
      ctx.globalAlpha = 0.28 * this.fade * (1 - this.hover * 0.6);
      ctx.lineWidth = 4 * (1 - i / LINKS);
      ctx.beginPath();
      ctx.moveTo(p[i * 2 - 2], p[i * 2 - 1]);
      ctx.lineTo(p[i * 2], p[i * 2 + 1]);
      ctx.stroke();
      bounds.add(p[i * 2], p[i * 2 + 1], 6);
    }
  }

  private drawRing(ctx: CanvasRenderingContext2D, bounds: Bounds) {
    if (this.hover < 0.02) return;
    const r = (8 + this.hover * 16) * (1 - this.press * 0.18);
    ctx.globalAlpha = 0.18 * this.hover * this.fade;
    ctx.fillStyle = P.ink[300];
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85 * this.hover * this.fade;
    ctx.strokeStyle = P.ink[900];
    ctx.lineWidth = 1.5;
    ctx.stroke();
    bounds.add(this.x, this.y, r + 4);
  }

  private drawArrow(ctx: CanvasRenderingContext2D, bounds: Bounds) {
    // A touch smaller over clickable things (the ring takes over) and when pressed.
    const k = 1.05 * (1 - this.hover * 0.18) * (1 - this.press * 0.12);
    ctx.globalAlpha = this.fade;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(k, k);
    ctx.beginPath();
    ARROW.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = P.white;
    ctx.stroke();
    ctx.fillStyle = P.ink[900];
    ctx.fill();
    ctx.restore();
    bounds.add(this.x + 8, this.y + 12, 30);
  }
}
