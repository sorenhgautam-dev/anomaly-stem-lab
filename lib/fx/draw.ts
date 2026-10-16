import { glowSprite, smokeSprite } from "./sprites";
import type { Arc, Bounds, FxWorld, Particle, Ring } from "./world";

/*
 * Paints an FxWorld onto a 2D canvas. Smoke and confetti blend normally;
 * everything that emits light (sparks, glows, rings, arcs, flashes) adds up
 * with "lighter", so overlapping light gets brighter like real light does.
 * Every draw grows `bounds`, so the next frame only clears what was drawn.
 */

const easeOut = (t: number) => 1 - (1 - t) ** 3;

export function drawWorld(ctx: CanvasRenderingContext2D, world: FxWorld, bounds: Bounds) {
  ctx.globalCompositeOperation = "source-over";
  for (const p of world.particles) if (p.age >= 0 && (p.kind === "smoke" || p.kind === "confetti")) drawSoft(ctx, p, bounds);
  ctx.globalCompositeOperation = "lighter";
  for (const f of world.flashes) {
    if (f.age < 0) continue;
    const t = f.age / f.life;
    const r = f.radius * (0.6 + 0.4 * easeOut(t));
    ctx.globalAlpha = (1 - t) ** 2;
    ctx.drawImage(glowSprite(f.color), f.x - r, f.y - r, r * 2, r * 2);
    bounds.add(f.x, f.y, r);
  }
  for (const ring of world.rings) if (ring.age >= 0) drawRing(ctx, ring, bounds);
  for (const arc of world.arcs) drawArc(ctx, arc, bounds);
  for (const p of world.particles) if (p.age >= 0 && p.kind !== "smoke" && p.kind !== "confetti") drawBright(ctx, p, bounds);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawSoft(ctx: CanvasRenderingContext2D, p: Particle, bounds: Bounds) {
  const t = p.age / p.life;
  if (p.kind === "smoke") {
    ctx.globalAlpha = p.alpha * Math.sin(Math.PI * Math.min(1, t * 1.4 + 0.08)) * 0.55;
    const s = p.size;
    ctx.drawImage(smokeSprite(), p.x - s, p.y - s, s * 2, s * 2);
    bounds.add(p.x, p.y, s);
    return;
  }
  // Confetti: a little card that flips as it tumbles.
  ctx.globalAlpha = p.alpha * Math.min(1, (1 - t) * 4);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(1, Math.cos(p.age * 9 + p.rot * 3) || 0.01);
  ctx.fillStyle = p.color;
  ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9);
  ctx.restore();
  bounds.add(p.x, p.y, p.size * 1.5);
}

function drawBright(ctx: CanvasRenderingContext2D, p: Particle, bounds: Bounds) {
  const t = p.age / p.life;
  const fade = p.alpha * (1 - t) ** 1.5;
  if (p.kind === "spark") {
    // A streak along the velocity, brightest at the head.
    const sp = Math.hypot(p.vx, p.vy) || 1;
    const len = Math.min(40, sp * 0.03);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.size;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.x - (p.vx / sp) * len, p.y - (p.vy / sp) * len);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    const g = p.size * 3.2;
    ctx.globalAlpha = fade * 0.7;
    ctx.drawImage(glowSprite(p.color), p.x - g, p.y - g, g * 2, g * 2);
    bounds.add(p.x, p.y, Math.max(len, g) + 2);
    return;
  }
  if (p.kind === "shard") {
    // Triangles, not dots: the ANOMALY burst differs from gold in shape too.
    ctx.globalAlpha = fade;
    ctx.fillStyle = p.color;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.lineTo(p.size * 0.55, p.size * 0.7);
    ctx.lineTo(-p.size * 0.6, p.size * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    bounds.add(p.x, p.y, p.size + 1);
    return;
  }
  const s = p.size * (1 - t * 0.4);
  ctx.globalAlpha = fade;
  ctx.drawImage(glowSprite(p.color), p.x - s, p.y - s, s * 2, s * 2);
  bounds.add(p.x, p.y, s);
}

function drawRing(ctx: CanvasRenderingContext2D, ring: Ring, bounds: Bounds) {
  const t = ring.age / ring.life;
  const r = ring.from + (ring.to - ring.from) * easeOut(t);
  ctx.globalAlpha = (1 - t) ** 1.6;
  ctx.strokeStyle = ring.color;
  ctx.lineWidth = ring.width * (1 - t * 0.6);
  if (ring.broken) {
    // Segments that jump about: an unstable, glitching ring.
    const segs = 9;
    for (let i = 0; i < segs; i++) {
      if (Math.random() < 0.25) continue;
      const a = (i / segs) * Math.PI * 2 + Math.random() * 0.2;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, r + (Math.random() - 0.5) * 6, a, a + (Math.PI * 2) / segs - 0.18);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  bounds.add(ring.x, ring.y, r + ring.width + 8);
}

function drawArc(ctx: CanvasRenderingContext2D, arc: Arc, bounds: Bounds) {
  const t = arc.age / arc.life;
  // Midpoint displacement, regenerated every frame so the bolt crackles.
  const pts: [number, number][] = [
    [arc.x1, arc.y1],
    [arc.x2, arc.y2],
  ];
  let offset = Math.hypot(arc.x2 - arc.x1, arc.y2 - arc.y1) * arc.jag;
  for (let level = 0; level < 5; level++) {
    for (let i = pts.length - 1; i > 0; i--) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const n = Math.hypot(by - ay, bx - ax) || 1;
      const k = (Math.random() - 0.5) * offset;
      pts.splice(i, 0, [(ax + bx) / 2 - ((by - ay) / n) * k, (ay + by) / 2 + ((bx - ax) / n) * k]);
    }
    offset *= 0.5;
  }
  const flicker = Math.random() < 0.18 ? 0.25 : 1;
  for (const [width, alpha] of [
    [6, 0.18],
    [1.6, 0.95],
  ] as const) {
    ctx.globalAlpha = alpha * (1 - t) * flicker;
    ctx.strokeStyle = arc.color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.stroke();
  }
  for (const [x, y] of pts) bounds.add(x, y, 8);
}
