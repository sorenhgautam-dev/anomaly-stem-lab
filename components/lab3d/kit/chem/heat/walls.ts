/*
 * Wall bounces for the particle swarm (swarm.ts): a sphere (a balloon), or a
 * cylinder standing on y = 0 (the water in a beaker). A particle that has
 * crossed the wall is backed up to where it crossed, reflected about the
 * wall's normal there and sent on, so each path keeps its angle (clamping
 * it radially instead slowly turns every path towards the centre).
 */

/** Bounce particle `o` (its index × 3) off a wall of radius `r`; `height` 0 means a sphere, else a cylinder with floor and lid `size` in. */
export function bounce(p: Float32Array, d: Float32Array, o: number, radius: number, height: number, size: number): void {
  const r = Math.max(0.01, radius);
  // The sphere uses all three axes; the cylinder's side only x and z.
  const sphere = height <= 0;
  const py = sphere ? p[o + 1] : 0;
  const dy = sphere ? d[o + 1] : 0;
  const l2 = p[o] * p[o] + py * py + p[o + 2] * p[o + 2];
  if (l2 > r * r) {
    const a = d[o] * d[o] + dy * dy + d[o + 2] * d[o + 2];
    const pd = p[o] * d[o] + py * dy + p[o + 2] * d[o + 2];
    const disc = pd * pd - a * (l2 - r * r);
    if (pd > 0 && a > 1e-6 && disc >= 0) {
      const back = (pd - Math.sqrt(disc)) / a;
      const hx = p[o] - d[o] * back;
      const hy = py - dy * back;
      const hz = p[o + 2] - d[o + 2] * back;
      const dot = (d[o] * hx + dy * hy + d[o + 2] * hz) / (r * r);
      d[o] -= 2 * dot * hx;
      d[o + 2] -= 2 * dot * hz;
      p[o] = hx + d[o] * back;
      p[o + 2] = hz + d[o + 2] * back;
      if (sphere) {
        d[o + 1] -= 2 * dot * hy;
        p[o + 1] = hy + d[o + 1] * back;
      }
    } else {
      // Outside but heading in (the container shrank): pull it onto the wall.
      const k = r / Math.sqrt(l2);
      p[o] *= k;
      p[o + 2] *= k;
      if (sphere) p[o + 1] *= k;
    }
  }
  if (sphere) return;
  const top = Math.max(size, height - size);
  if (p[o + 1] < size) {
    p[o + 1] = size;
    d[o + 1] = Math.abs(d[o + 1]);
  } else if (p[o + 1] > top) {
    p[o + 1] = top;
    d[o + 1] = -Math.abs(d[o + 1]);
  }
}
