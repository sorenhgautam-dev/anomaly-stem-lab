import { RAMP } from "@/lib/tokens";
import { glowSprite } from "@/lib/fx/sprites";
import type { Bounds, FxWorld } from "@/lib/fx/world";

/*
 * The swipe cursor: a small bright dot that sits exactly on the pointer (so
 * aiming stays precise), trailing a ribbon of light that stretches into a
 * swoosh when you move fast and folds back into the dot when you stop.
 * Over anything clickable a thin ring opens round it; a click sends out a
 * ripple. Replaces the system cursor on mouse devices (globals.css).
 */

/** Points along the ribbon. */
const LINKS = 20;
/** How fast each link chases the one ahead (1/s). Higher = shorter tail. */
const FOLLOW = 88;

const ease = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);

export class SwipeCursor {
  x = 0;
  y = 0;
  /** Pointer is inside the window and over something the custom cursor draws on. */
  shown = false;
  /** Over a link, button or slider. */
  hovering = false;
  pressed = false;
  links = LINKS;
  private pts = new Float32Array(LINKS * 2);
  private placed = false;
  private fade = 0;
  private hover = 0;
  private press = 0;
  private speed = 0;
  private vx = 0;
  private vy = 0;
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

  /** A click: ripple and a few tiny sparks. */
  release() {
    this.world.ring({ x: this.x, y: this.y, from: 6, to: 30, life: 0.42, color: RAMP.glow[200], width: 1.4 });
    this.world.burst({
      x: this.x,
      y: this.y,
      count: 7,
      kind: "glow",
      colors: [RAMP.glow[200], RAMP.ion[200]],
      speed: [70, 150],
      life: [0.22, 0.38],
      size: [2, 3.2],
      drag: 7,
    });
  }

  /** Advance one frame. Returns false once everything has settled. */
  step(dt: number): boolean {
    const p = this.pts;
    const k = ease(dt, FOLLOW);
    p[0] = this.x;
    p[1] = this.y;
    let spread = 0;
    for (let i = 1; i < this.links; i++) {
      p[i * 2] += (p[i * 2 - 2] - p[i * 2]) * k;
      p[i * 2 + 1] += (p[i * 2 - 1] - p[i * 2 + 1]) * k;
      spread += Math.abs(p[i * 2] - this.x) + Math.abs(p[i * 2 + 1] - this.y);
    }
    if (dt > 0) {
      const ivx = (this.x - this.lastX) / dt;
      const ivy = (this.y - this.lastY) / dt;
      const ks = ease(dt, 14);
      this.vx += (ivx - this.vx) * ks;
      this.vy += (ivy - this.vy) * ks;
      this.speed = Math.hypot(this.vx, this.vy);
    }
    this.lastX = this.x;
    this.lastY = this.y;
    this.fade += ((this.shown ? 1 : 0) - this.fade) * ease(dt, 12);
    this.hover += ((this.hovering ? 1 : 0) - this.hover) * ease(dt, 16);
    this.press += ((this.pressed ? 1 : 0) - this.press) * ease(dt, 24);
    const settling =
      Math.abs(this.fade - (this.shown ? 1 : 0)) > 0.01 ||
      Math.abs(this.hover - (this.hovering ? 1 : 0)) > 0.01 ||
      Math.abs(this.press - (this.pressed ? 1 : 0)) > 0.01;
    return spread > 0.5 || this.speed > 2 || settling;
  }

  draw(ctx: CanvasRenderingContext2D, bounds: Bounds) {
    if (this.fade < 0.01 || !this.placed) return;
    ctx.globalCompositeOperation = "lighter";
    this.drawRibbon(ctx, bounds);
    this.drawDot(ctx, bounds);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  private drawRibbon(ctx: CanvasRenderingContext2D, bounds: Bounds) {
    const p = this.pts;
    const n = this.links;
    const tailX = p[(n - 1) * 2];
    const tailY = p[(n - 1) * 2 + 1];
    if (Math.hypot(tailX - this.x, tailY - this.y) < 3) return;
    const head = 1.6 + Math.min(1, this.speed / 1400) * 5.5;
    const left: number[] = [];
    const right: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1);
      const b = Math.min(n - 1, i + 1);
      let tx = p[a * 2] - p[b * 2];
      let ty = p[a * 2 + 1] - p[b * 2 + 1];
      const len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      const w = head * (1 - i / (n - 1)) ** 1.25;
      left.push(p[i * 2] - ty * w, p[i * 2 + 1] + tx * w);
      right.push(p[i * 2] + ty * w, p[i * 2 + 1] - tx * w);
      bounds.add(p[i * 2], p[i * 2 + 1], head * 3 + 2);
    }
    const shape = (scale: number) => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const cx = p[i * 2];
        const cy = p[i * 2 + 1];
        const lx = cx + (left[i * 2] - cx) * scale;
        const ly = cy + (left[i * 2 + 1] - cy) * scale;
        if (i === 0) ctx.moveTo(lx, ly);
        else ctx.lineTo(lx, ly);
      }
      for (let i = n - 1; i >= 0; i--) {
        const cx = p[i * 2];
        const cy = p[i * 2 + 1];
        ctx.lineTo(cx + (right[i * 2] - cx) * scale, cy + (right[i * 2 + 1] - cy) * scale);
      }
      ctx.closePath();
    };
    const g = ctx.createLinearGradient(this.x, this.y, tailX, tailY);
    g.addColorStop(0, RAMP.mist[100]);
    g.addColorStop(0.22, RAMP.glow[200]);
    g.addColorStop(0.6, RAMP.ion[400]);
    g.addColorStop(1, `${RAMP.ion[600]}00`);
    ctx.fillStyle = g;
    // A wide faint pass for glow, then the crisp ribbon.
    ctx.globalAlpha = 0.16 * this.fade;
    shape(2.8);
    ctx.fill();
    ctx.globalAlpha = 0.85 * this.fade;
    shape(1);
    ctx.fill();
  }

  private drawDot(ctx: CanvasRenderingContext2D, bounds: Bounds) {
    const { x, y } = this;
    const glow = 15 + this.hover * 6;
    ctx.globalAlpha = (0.42 - this.hover * 0.12) * this.fade;
    ctx.drawImage(glowSprite(RAMP.ion[400]), x - glow, y - glow, glow * 2, glow * 2);
    // The dot stretches a little along the motion, like a swipe.
    const stretch = Math.min(0.9, this.speed / 2200);
    const r = 3.4 * (1 - this.hover * 0.3) * (1 - this.press * 0.25);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(this.vy, this.vx));
    ctx.globalAlpha = this.fade;
    ctx.fillStyle = RAMP.mist[100];
    ctx.beginPath();
    ctx.ellipse(0, 0, r * (1 + stretch), r / (1 + stretch * 0.45), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (this.hover > 0.02) {
      const ring = (8 + this.hover * 12) * (1 - this.press * 0.2);
      ctx.globalAlpha = 0.6 * this.hover * this.fade;
      ctx.strokeStyle = RAMP.mist[100];
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(x, y, ring, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.07 * this.hover * this.fade;
      ctx.fillStyle = RAMP.ion[400];
      ctx.fill();
    }
    bounds.add(x, y, glow + 24);
  }
}
