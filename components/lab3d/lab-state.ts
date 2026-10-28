import { Vector3 } from "three";

/*
 * What the lab's DOM HUD and its 3D scene share, as plain mutable state
 * (never React state per frame, CLAUDE.md §9):
 *  - el:        the 3D view's DOM box (for the hover cursor and screen maths)
 *  - anchors:   world positions of named things (slots, instruments), so the
 *               run hook can fire VFX at a part and Ano can fly to it
 *  - anoScreen: where Ano is on screen, so the speech bubble can sit by him
 *  - focus:     the anchor Ano should point at (set on ANOMALY), or null
 *  - frame:     how the camera fits the picture into the space above the
 *               dock on wide screens (CameraDirector): zoomed out by s and
 *               offset by (ox, oy) px; Ano's home allows for it
 *  - idea:      a part's inspect label is carrying the student's idea, so
 *               the floating "Your idea" label steps aside (never two labels
 *               stacked on one part)
 *  - point:     bumps when the replay pauses at "the moment you were wrong"
 * Stages set the "focus" anchor (what shows the result) and may set "ghost"
 * (where the prediction's ghost label floats) and "ano" (where Ano floats to
 * point the result out, when beside the part there's no room).
 */

export const labView = {
  el: null as HTMLElement | null,
  anchors: new Map<string, Vector3>(),
  anoScreen: { x: 0, y: 0, visible: false },
  focus: null as string | null,
  frame: { s: 1, ox: 0, oy: 0 },
  idea: false,
  /** Bumped when the replay stops at the moment the student's idea split off: Ano flies to point at labView.focus. */
  point: 0,
};

/** The soft cursor grows over 3D things you can click (DESIGN.md §9.1). */
export function hoverCursor(on: boolean): void {
  const el = labView.el;
  if (!el) return;
  if (on) el.dataset.cursor = "hover";
  else delete el.dataset.cursor;
}

export function setAnchor(id: string, at: Vector3): void {
  labView.anchors.set(id, at.clone());
}

/** An anchor's position, or the bench centre. */
export function anchor(id: string | null | undefined): Vector3 {
  return (id && labView.anchors.get(id)?.clone()) || new Vector3(0, 0.3, 0);
}
