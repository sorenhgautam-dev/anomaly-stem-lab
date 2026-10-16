/*
 * The VFX layer's public API (CLAUDE.md §3.6.4, §3.7): one call per moment,
 * or a stream fed every frame, all in screen pixels. Works from anywhere
 * (event handlers, playback listeners); calls are ignored until
 * components/fx/FxLayer.tsx has mounted. Low quality halves the particles;
 * reduced motion keeps only soft flashes.
 */

export { bindFx, centreOf, type Point2 } from "./binding";
export { fx } from "./moments";
export { stream, type StreamKind } from "./streams";
