/*
 * When the site canvas has drawn its first frame, for the preloader
 * (components/loading/Preloader.tsx). Plain module state, no React.
 */

let ready = false;
const waiting = new Set<() => void>();

export function markCanvasReady(): void {
  if (ready) return;
  ready = true;
  waiting.forEach((cb) => cb());
  waiting.clear();
}

/** Calls `cb` once the canvas is ready (now, if it already is). Returns an unsubscribe. */
export function onCanvasReady(cb: () => void): () => void {
  if (ready) {
    cb();
    return () => {};
  }
  waiting.add(cb);
  return () => waiting.delete(cb);
}
