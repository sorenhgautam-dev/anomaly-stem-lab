"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CameraControls, PerspectiveCamera } from "@react-three/drei";
import type { PerspectiveCamera as PerspectiveCamera3 } from "three";
import CameraControlsImpl from "camera-controls";
import { prefersReducedMotion } from "@/lib/motion";
import { labView } from "../lab-state";
import type { Shot, StageShots } from "../shots";
import { useShotName } from "./useShotName";

/*
 * The camera guides the student through the one continuous space (DESIGN.md
 * §8.1): it glides in on arrival, settles on the bench to build, moves closer
 * once a prediction is chosen, takes the run's best angle, and pulls back for
 * the reveal. Students can orbit (drag), zoom (scroll or pinch) and
 * double-click to reset. On wide screens the picture zooms out a little to stay clear
 * of the dock as it grows. Reduced motion: every move is a cut.
 */

/** The fixed top bar's height on wide screens (ExploreBar), in CSS pixels. */
const TOP_BAR = 96;
/** The share of the screen's height each shot is framed for (between the top bar and a short dock), and how far the picture may zoom out to fit a taller dock. */
const FREE_SHARE = 0.6;
const MAX_ZOOM_OUT = 1.4;

function lookAt(c: CameraControlsImpl | null, shot: Shot | undefined, smooth: boolean) {
  if (c && shot) void c.setLookAt(...shot.position, ...shot.target, smooth && !prefersReducedMotion());
}

export function CameraDirector({ shots }: { shots: StageShots }) {
  const controls = useRef<CameraControlsImpl>(null);
  const name = useShotName(shots);
  const shotsRef = useRef(shots);
  const nameRef = useRef(name);

  useEffect(() => {
    shotsRef.current = shots;
    nameRef.current = name;
  });

  // drei rebuilds the controls once the view connects its event target, so
  // set each new instance up: arrive wide and high, then glide onto the shot.
  const seen = useRef<CameraControlsImpl | null>(null);
  useFrame(() => {
    const c = controls.current;
    if (!c || c === seen.current) return;
    seen.current = c;
    c.smoothTime = 0.65;
    c.draggingSmoothTime = 0.12;
    if (window.matchMedia("(pointer: coarse)").matches) {
      // One finger scrolls the page; two fingers orbit and zoom.
      c.touches.one = CameraControlsImpl.ACTION.NONE;
      c.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY_ROTATE;
    }
    lookAt(c, shotsRef.current.arrive, false);
    lookAt(c, shotsRef.current[nameRef.current], true);
  });

  // Wide screens: the view fills the screen under the HUD, and the dock at the bottom grows with the result.
  // Fit the picture into the clear space between the top bar and the dock's top edge: when that space is
  // short, zoom out a little (eased), so the dock never covers the apparatus and its labels never slide
  // under the top bar. labView.frame shares the target with Ano's placement.
  const fit = useRef({ s: 1, cy: Number.NaN });
  useFrame(({ camera, size }) => {
    const cam = camera as PerspectiveCamera3;
    const { width: W, height: H } = size;
    const dock = W >= 1024 ? document.querySelector("[data-lab-dock]")?.getBoundingClientRect() : undefined;
    const bottom = dock ? Math.min(dock.top, H) : H;
    // Zoom out only as much as the space above the dock needs, about the top edge (pinned under the top
    // bar, where each shot already leaves room): nothing slides under the bar, and a short dock changes nothing.
    const s = dock ? Math.min(MAX_ZOOM_OUT, Math.max(1, (FREE_SHARE * H) / Math.max(1, bottom - TOP_BAR))) : 1;
    const cy = TOP_BAR + (H / 2 - TOP_BAR) / s;
    labView.frame = { s, ox: W / (2 * s) - W / 2, oy: H / (2 * s) - cy };
    const k = prefersReducedMotion() ? 1 : 0.08;
    const f = fit.current;
    f.s += (s - f.s) * k;
    f.cy = Number.isNaN(f.cy) ? cy : f.cy + (cy - f.cy) * k;
    if (Math.abs(f.s - 1) < 0.002 && Math.abs(f.cy - H / 2) < 0.5) {
      if (cam.view?.enabled) cam.clearViewOffset();
      return;
    }
    cam.setViewOffset(W / f.s, H / f.s, W / (2 * f.s) - W / 2, H / (2 * f.s) - f.cy, W, H);
  });

  // Double-click resets the view to the current shot. ?debug=camera exposes the controls.
  useEffect(() => {
    const el = labView.el;
    const reset = () => lookAt(controls.current, shotsRef.current[nameRef.current], true);
    el?.addEventListener("dblclick", reset);
    if (new URLSearchParams(window.location.search).get("debug")?.includes("camera")) (window as unknown as { __labCamera?: () => CameraControlsImpl | null }).__labCamera = () => controls.current;
    return () => el?.removeEventListener("dblclick", reset);
  }, []);

  useEffect(() => {
    lookAt(controls.current, shots[name], true);
  }, [name, shots]);

  return (
    <>
      <PerspectiveCamera makeDefault fov={32} near={0.05} far={60} position={shots.arrive.position} />
      <CameraControls ref={controls} makeDefault minDistance={0.9} maxDistance={14} minPolarAngle={0.2} maxPolarAngle={1.42} minAzimuthAngle={-1.15} maxAzimuthAngle={1.15} dollySpeed={0.5} azimuthRotateSpeed={0.55} polarRotateSpeed={0.55} truckSpeed={0} />
    </>
  );
}
