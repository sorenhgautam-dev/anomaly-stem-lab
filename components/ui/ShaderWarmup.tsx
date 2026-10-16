"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";

/*
 * Compiles every shader in the scene up front, waits two frames, then calls
 * onReady once, so a scene can fade in without first-frame hitches. Mount
 * inside the <Suspense> that holds the scene's content.
 */
export function ShaderWarmup({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  });

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        raf = requestAnimationFrame(() => {
          raf = requestAnimationFrame(() => ready.current());
        });
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [gl, scene, camera]);

  return null;
}
