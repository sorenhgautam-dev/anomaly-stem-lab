"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, PerspectiveCamera, Vector3 } from "three";
import { CAMERA_KEYS } from "./layout";
import { live } from "./live";

/*
 * Scroll drives the camera along a spline (CLAUDE.md §3.1.5). Scroll doesn't
 * move the page: it sets t in [0, 1] along a CatmullRomCurve3 through one key
 * per chapter. Progress is damped on top of Lenis so the camera feels heavy;
 * scrolling up retraces the same path. With reduced motion the camera cuts
 * between chapter keys instead of flying.
 */

const BASE_TAN_V = Math.tan((35 / 2) * (Math.PI / 180));
const MAX_TAN_V = Math.tan(44 * (Math.PI / 180));

export function CameraRail() {
  const rail = useMemo(() => {
    const pos = new CatmullRomCurve3(
      CAMERA_KEYS.map((k) => new Vector3(...k.pos)),
      false,
      "centripetal",
    );
    const look = new CatmullRomCurve3(
      CAMERA_KEYS.map((k) => new Vector3(...k.look)),
      false,
      "centripetal",
    );
    return { pos, look };
  }, []);

  const frame = useRef({ t: 0, pos: new Vector3(), look: new Vector3(), lookNow: new Vector3(0, 0.1, 0), init: false });

  useFrame((state, delta) => {
    const s = frame.current;
    const dt = Math.min(delta, 1 / 20);
    const cam = state.camera;
    const reduced = live.reducedMotion;
    const goal = reduced ? Math.round(live.progress * 4) / 4 : live.progress;
    s.t = reduced ? goal : s.t + (goal - s.t) * (1 - Math.exp(-dt * 3.2));

    rail.pos.getPoint(s.t, s.pos);
    rail.look.getPoint(s.t, s.look);

    // Narrow screens: widen the field of view just enough to keep the hero
    // balls (then the title) in frame. Moving the camera back instead would
    // push it past the hero balls in later chapters. The sideways look offset
    // that puts the title beside the copy is dropped once copy stacks below.
    const aspect = state.size.width / state.size.height;
    s.look.x *= Math.min(1, Math.max(0, (aspect - 0.9) / 0.4));
    if (cam instanceof PerspectiveCamera) {
      const needH = 0.26 + 0.19 * Math.min(1, s.t / 0.25);
      const tanV = Math.min(MAX_TAN_V, Math.max(BASE_TAN_V, needH / aspect));
      const fov = (2 * Math.atan(tanV) * 180) / Math.PI;
      if (Math.abs(cam.fov - fov) > 0.01) {
        cam.fov = fov;
        cam.updateProjectionMatrix();
      }
    }

    // A little parallax from the pointer.
    if (!reduced) {
      s.pos.x += state.pointer.x * 0.16;
      s.pos.y += state.pointer.y * 0.09;
    }

    if (!s.init || reduced) {
      cam.position.copy(s.pos);
      s.lookNow.copy(s.look);
      s.init = true;
    } else {
      cam.position.lerp(s.pos, 1 - Math.exp(-dt * 5));
      s.lookNow.lerp(s.look, 1 - Math.exp(-dt * 5));
    }
    cam.lookAt(s.lookNow);
  });

  return null;
}
