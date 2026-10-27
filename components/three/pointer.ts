/*
 * The pointer, shared by every 3D view on the site canvas. Views are drawn in
 * scissored rectangles of one canvas, so each reads the pointer in viewport
 * pixels and works out its own direction. Plain mutable state, never React
 * state (CLAUDE.md §9).
 */

export const pointer = {
  x: 0,
  y: 0,
  /** A mouse or pen moved over the page recently. */
  active: false,
  /** The last press, for "react to clicks near it" (DESIGN.md §9.1). */
  down: { x: 0, y: 0, at: -1 },
};

let bound = false;

export function bindPointer(): void {
  if (bound || typeof window === "undefined") return;
  bound = true;
  pointer.x = window.innerWidth / 2;
  pointer.y = window.innerHeight / 2;
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    },
    { passive: true },
  );
  window.addEventListener(
    "pointerdown",
    (e) => {
      pointer.down = { x: e.clientX, y: e.clientY, at: performance.now() };
    },
    { passive: true },
  );
  document.addEventListener("pointerleave", () => (pointer.active = false));
}
