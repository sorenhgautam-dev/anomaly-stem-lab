"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// WebGL never renders on the server (CLAUDE.md §10).
const LabRoom = dynamic(() => import("./LabRoom"), { ssr: false });

/**
 * The 3D lab behind every page under /labs: a lab's map and its
 * experiments. It stays mounted while you move between them, so the change
 * is a camera move instead of a reload (CLAUDE.md §3.7).
 */
export function LabRoomMount() {
  const pathname = usePathname();
  return pathname.startsWith("/labs/") ? <LabRoom /> : null;
}
