/*
 * Soft sprites for the VFX layer, drawn once into small offscreen canvases
 * and stamped with drawImage, which is far cheaper than canvas shadows or a
 * gradient per particle.
 */

const glowCache = new Map<string, HTMLCanvasElement>();
let smoke: HTMLCanvasElement | null = null;

const SIZE = 64;

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return [c, c.getContext("2d")!];
}

/** A radial glow in one colour: bright centre fading to nothing. */
export function glowSprite(color: string): HTMLCanvasElement {
  const hit = glowCache.get(color);
  if (hit) return hit;
  const [c, ctx] = canvas(SIZE);
  const g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.18, color);
  g.addColorStop(0.45, `${color}55`);
  g.addColorStop(1, `${color}00`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  glowCache.set(color, c);
  return c;
}

/** A lumpy, soft smoke puff in white; tinted by globalAlpha only. */
export function smokeSprite(): HTMLCanvasElement {
  if (smoke) return smoke;
  const size = SIZE * 2;
  const [c, ctx] = canvas(size);
  const blobs = [
    [0.5, 0.5, 0.42],
    [0.38, 0.44, 0.26],
    [0.63, 0.42, 0.24],
    [0.52, 0.62, 0.28],
  ];
  for (const [x, y, r] of blobs) {
    const g = ctx.createRadialGradient(x * size, y * size, 0, x * size, y * size, r * size);
    g.addColorStop(0, "rgba(220,235,234,0.5)");
    g.addColorStop(1, "rgba(220,235,234,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  smoke = c;
  return c;
}
