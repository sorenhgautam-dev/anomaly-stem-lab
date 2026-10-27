"use client";

import dynamic from "next/dynamic";

// WebGL never renders on the server (CLAUDE.md §10).
const SiteCanvas = dynamic(() => import("./SiteCanvas"), { ssr: false });

/** Mounts the site's one 3D canvas (see SiteCanvas). Put it in the root layout. */
export function SiteCanvasMount() {
  return <SiteCanvas />;
}
