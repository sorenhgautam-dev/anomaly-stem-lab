"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CameraControls, PerspectiveCamera } from "@react-three/drei";
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
 * double-click to reset. Reduced motion: every move is a cut.
 */

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
