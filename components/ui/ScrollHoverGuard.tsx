"use client";

import { useEffect } from "react";

/*
 * While the page scrolls, hover effects pause (html[data-scrolling],
 * app/globals.css): rows and cards sliding under a still mouse each started
 * a hover fade and repainted mid-scroll, which dropped frames (My ideas fell
 * to about 53 fps). Hover comes back 150 ms after the scroll stops. Mounted
 * once, for every page.
 */
export function ScrollHoverGuard() {
  useEffect(() => {
    const root = document.documentElement;
    let idle = 0;
    const onScroll = () => {
      if (!idle) root.dataset.scrolling = "";
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        idle = 0;
        delete root.dataset.scrolling;
      }, 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(idle);
      delete root.dataset.scrolling;
    };
  }, []);
  return null;
}
