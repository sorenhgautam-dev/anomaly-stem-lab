/*
 * The lab room's camera, locked to the experiment window (CLAUDE.md §3.6.2).
 *
 * The 2D apparatus is drawn by the DOM in the "window" (the stage panel).
 * We place the 3D world so that the window is a real plane in the room: the
 * camera looks straight at that plane, and an off-axis projection (lens
 * shift, three.js setViewOffset) puts the plane exactly under the DOM box,
 * wherever the layout puts it. Moving the camera for mouse parallax shifts
 * the lens by the same amount, so the window plane stays pinned to the DOM
 * while everything nearer or farther slides past it: the apparatus reads as
 * a flat object standing in the room.
 *
 * World: the bench top is y = 0, and the point where the window plane meets
 * the bench line is the origin. Pure maths, no three.js, so it is unit
 * tested (rig-math.test.ts).
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RigInput {
  viewW: number;
  viewH: number;
  /** The window in screen pixels. */
  win: Rect;
  /** Screen y of the line where the window plane meets the bench top. */
  benchY: number;
  /** Where the camera's eye level sits, as a fraction of the window height. */
  horizon: number;
  /** World width of the window (sets the camera distance). */
  worldWidth: number;
  /** Camera pitch in radians, positive looks down. The window plane tilts with it. */
  pitch: number;
  /** Vertical field of view in degrees. */
  fov: number;
  /** Camera offset in world units along its own right and up axes. */
  parallax: { x: number; y: number };
}

export interface RigOutput {
  position: [number, number, number];
  /** A point straight ahead of the camera (it never turns, only shifts its lens). */
  target: [number, number, number];
  /** setViewOffset(viewW, viewH, offsetX, offsetY, viewW, viewH). */
  offsetX: number;
  offsetY: number;
  /** World units per screen pixel on the window plane. */
  unit: number;
  /** Window edges on its plane, in world units from the origin (right and up along the plane). */
  frame: { left: number; right: number; top: number; bottom: number };
}

export function solveRig(i: RigInput): RigOutput {
  const unit = i.worldWidth / Math.max(1, i.win.w);
  const distance = (unit * i.viewH) / (2 * Math.tan((i.fov * Math.PI) / 360));
  const px = i.win.x + i.win.w / 2;
  const py = i.win.y + i.win.h * i.horizon;
  // The bench point's height on the plane, relative to the eye-level point.
  const v = (py - i.benchY) * unit;
  const cos = Math.cos(i.pitch);
  const sin = Math.sin(i.pitch);
  // Plane axes: up = (0, cos, −sin), forward = (0, −sin, −cos).
  const cy = -cos * v;
  const cz = sin * v;
  const position: [number, number, number] = [
    i.parallax.x,
    cy + sin * distance + cos * i.parallax.y,
    cz + cos * distance - sin * i.parallax.y,
  ];
  return {
    position,
    target: [position[0], position[1] - sin, position[2] - cos],
    offsetX: i.viewW / 2 - px - i.parallax.x / unit,
    offsetY: i.viewH / 2 - py + i.parallax.y / unit,
    unit,
    frame: {
      left: -i.worldWidth / 2,
      right: i.worldWidth / 2,
      top: (i.benchY - i.win.y) * unit,
      bottom: (i.benchY - (i.win.y + i.win.h)) * unit,
    },
  };
}

/** A point on the window plane (right, up from the origin) in world space. */
export function planePoint(a: number, b: number, pitch: number): [number, number, number] {
  return [a, Math.cos(pitch) * b, -Math.sin(pitch) * b];
}
