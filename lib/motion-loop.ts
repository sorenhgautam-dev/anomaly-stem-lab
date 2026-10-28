/*
 * One requestAnimationFrame loop and one pointer listener for every DOM
 * spring on the page (DESIGN.md §9.1, react-best-practices
 * "client-event-listeners"). Each animation registers a tick that returns
 * true while it is still moving; the loop sleeps when none are. Values live
 * in plain objects and are written straight to the DOM, never React state
 * (CLAUDE.md §9).
 */

type Tick = (dt: number) => boolean;

const active = new Set<Tick>();
let raf = 0;
let last = 0;

function frame(now: number) {
  const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
  last = now;
  for (const tick of active) if (!tick(dt)) active.delete(tick);
  raf = active.size ? requestAnimationFrame(frame) : 0;
  if (!raf) last = 0;
}

/** Run `tick` every frame until it returns false. Adding a running tick again is a no-op. */
export function animate(tick: Tick): void {
  active.add(tick);
  if (!raf) raf = requestAnimationFrame(frame);
}

export function stopAnimating(tick: Tick): void {
  active.delete(tick);
}

/**
 * A damped spring. The defaults overshoot by about 8 % and settle in about
 * half a second: weighty, never linear.
 */
export class Spring {
  v = 0;
  target: number;

  constructor(
    public x = 0,
    public stiffness = 170,
    public damping = 17,
  ) {
    this.target = x;
  }

  /** Advance by dt seconds; returns true while still moving. */
  step(dt: number): boolean {
    const a = this.stiffness * (this.target - this.x) - this.damping * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
    const moving = Math.abs(this.v) > 0.002 || Math.abs(this.target - this.x) > 0.002;
    if (!moving) {
      this.x = this.target;
      this.v = 0;
    }
    return moving;
  }
}

/** The pointer in viewport pixels and as -1…1 across the viewport. */
export const domPointer = { x: 0, y: 0, nx: 0, ny: 0 };

const pointerListeners = new Set<() => void>();
let pointerBound = false;

/** Called on every mouse or pen move anywhere on the page. Returns an unsubscribe. */
export function onPointerMove(cb: () => void): () => void {
  if (!pointerBound) {
    pointerBound = true;
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType === "touch") return;
        domPointer.x = e.clientX;
        domPointer.y = e.clientY;
        domPointer.nx = (e.clientX / window.innerWidth - 0.5) * 2;
        domPointer.ny = (e.clientY / window.innerHeight - 0.5) * 2;
        pointerListeners.forEach((l) => l());
      },
      { passive: true },
    );
  }
  pointerListeners.add(cb);
  return () => pointerListeners.delete(cb);
}

/** Step every spring (none skipped); true while any is still moving. */
export function stepAll(dt: number, ...springs: Spring[]): boolean {
  let moving = false;
  for (const s of springs) moving = s.step(dt) || moving;
  return moving;
}
