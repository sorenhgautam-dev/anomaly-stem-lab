"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import type { LabId } from "@/engine/types";
import { solveRig, type Rect, type RigOutput } from "./rig-math";

type Frame = RigOutput["frame"];
import { room } from "./room-state";

/*
 * Drives the room camera from the experiment window's place on screen (see
 * rig-math.ts). Every input is damped, so when the window moves (a new
 * route, the map, a resize) the room glides to its new framing instead of
 * jumping. On the map there is no window: the camera pulls back to an
 * overview of the whole lab.
 */

interface Pose {
  pitch: number;
  horizon: number;
  worldWidth: number;
}

const POSES: Record<LabId, { bench: Pose; overview: Pose }> = {
  // Chemistry: eye level just above the bench, looking into the fume hood.
  chemistry: { bench: { pitch: 0.07, horizon: 0.27, worldWidth: 3.1 }, overview: { pitch: 0.16, horizon: 0.3, worldWidth: 5.6 } },
  // Robotics: looking down onto a holo board standing on the workbench.
  robotics: { bench: { pitch: 0.5, horizon: 0.42, worldWidth: 2.9 }, overview: { pitch: 0.62, horizon: 0.38, worldWidth: 5.4 } },
};

/** Hood / board size on the map, where there is no window to fit. */
const OVERVIEW_FRAME: Record<LabId, Frame> = {
  chemistry: { left: -1.55, right: 1.55, top: 1.45, bottom: -0.25 },
  robotics: { left: -1.45, right: 1.45, top: 1.3, bottom: 0 },
};

const FOV = 30;
/** Seconds between layout reads (plus one after every resize or scroll). */
const MEASURE_EVERY = 0.12;

export function CameraRig({ lab, reducedMotion }: { lab: LabId; reducedMotion: boolean }) {
  const s = useRef({
    measured: { win: { x: 0, y: 0, w: 1, h: 1 } as Rect, benchY: 0, locked: false },
    win: { x: 0, y: 0, w: 1, h: 1 } as Rect,
    benchY: 0,
    pose: { ...POSES[lab].overview },
    furniture: { ...OVERVIEW_FRAME[lab] },
    pointer: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    since: MEASURE_EVERY,
    snap: true,
    /** Seconds left of a slow glide (after switching between map and bench). */
    glide: 0,
    wasLocked: false,
  });

  useEffect(() => {
    const st = s.current;
    const onMove = (e: PointerEvent) => {
      st.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      st.pointer.y = 1 - (e.clientY / window.innerHeight) * 2;
    };
    const remeasure = () => (st.since = MEASURE_EVERY);
    const onScroll = () => {
      st.since = MEASURE_EVERY;
      st.snap = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, []);

  useFrame((state, delta) => {
    const st = s.current;
    const dt = Math.min(delta, 1 / 20);
    const W = state.size.width;
    const H = state.size.height;

    st.since += dt;
    if (st.since >= MEASURE_EVERY) {
      st.since = 0;
      measure(st.measured, lab, W, H);
    }
    const m = st.measured;
    const goal = m.locked ? POSES[lab].bench : POSES[lab].overview;
    if (m.locked !== st.wasLocked) {
      st.wasLocked = m.locked;
      st.glide = 1.4;
    }
    st.glide = Math.max(0, st.glide - dt);

    // Damp every input toward its goal: a slow, weighted glide between map and
    // bench, quick tracking when the window just changes size. Snap on the
    // first frame and on scroll.
    // Reduced motion: no flying, the room just cuts to its new framing.
    const k = st.snap || reducedMotion ? 1 : 1 - Math.exp(-dt * (st.glide > 0 ? 3.2 : 11));
    st.snap = false;
    st.win.x += (m.win.x - st.win.x) * k;
    st.win.y += (m.win.y - st.win.y) * k;
    st.win.w += (m.win.w - st.win.w) * k;
    st.win.h += (m.win.h - st.win.h) * k;
    st.benchY += (m.benchY - st.benchY) * k;
    st.pose.pitch += (goal.pitch - st.pose.pitch) * k;
    st.pose.horizon += (goal.horizon - st.pose.horizon) * k;
    st.pose.worldWidth += (goal.worldWidth - st.pose.worldWidth) * k;

    // Mouse parallax plus a slow idle drift, so the room never sits dead still.
    const kp = 1 - Math.exp(-dt * 2.2);
    st.look.x += (st.pointer.x - st.look.x) * kp;
    st.look.y += (st.pointer.y - st.look.y) * kp;
    const t = state.clock.elapsedTime;
    const amp = reducedMotion ? 0 : st.pose.worldWidth;
    const parallax = {
      x: (st.look.x * 0.06 + Math.sin(t * 0.11) * 0.008) * amp,
      y: (st.look.y * 0.035 + Math.sin(t * 0.17 + 1) * 0.005) * amp,
    };

    const out = solveRig({ viewW: W, viewH: H, win: st.win, benchY: st.benchY, horizon: st.pose.horizon, worldWidth: st.pose.worldWidth, pitch: st.pose.pitch, fov: FOV, parallax });
    const cam = state.camera as PerspectiveCamera;
    if (cam.fov !== FOV) cam.fov = FOV;
    cam.position.set(...out.position);
    cam.lookAt(...out.target);
    cam.setViewOffset(W, H, out.offsetX, out.offsetY, W, H);
    cam.updateProjectionMatrix();
    // The hood / board fits the window exactly, or settles to a fixed size on
    // the map; it only eases while gliding between the two.
    const want = m.locked ? out.frame : OVERVIEW_FRAME[lab];
    const kf = k === 1 || (m.locked && st.glide === 0) ? 1 : 1 - Math.exp(-dt * 5);
    for (const key of ["left", "right", "top", "bottom"] as const) st.furniture[key] += (want[key] - st.furniture[key]) * kf;
    room.frame = st.furniture;
    room.pitch = st.pose.pitch;
  }, -1);

  return null;
}

/** Read the window and bench line from the DOM, or fall back to an overview frame. */
function measure(m: { win: Rect; benchY: number; locked: boolean }, lab: LabId, W: number, H: number) {
  const el = room.windowEl;
  const r = el?.getBoundingClientRect();
  if (!el || !r || r.width < 40 || r.height < 40) {
    m.locked = false;
    m.win = { x: W * 0.1, y: H * 0.3, w: W * 0.8, h: H * 0.52 };
    m.benchY = H * 0.82;
    return;
  }
  m.locked = true;
  m.win = { x: r.left, y: r.top, w: r.width, h: r.height };
  if (lab === "robotics") {
    m.benchY = r.bottom;
    return;
  }
  // Chemistry stages draw their bench line in SVG; the 3D bench takes its place.
  const bench = el.querySelector("[data-bench]")?.getBoundingClientRect();
  m.benchY = bench && bench.height > 0 ? bench.top : r.top + r.height * 0.86;
}
