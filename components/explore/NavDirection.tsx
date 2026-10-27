"use client";

import { useEffect } from "react";

/*
 * The browser's back and forward buttons carry no transition type, so mark
 * the document for a moment after one, and the page wipe plays from the top
 * (html[data-nav-back] in app/globals.css), as a nav-back link does.
 */
export function NavDirection() {
  useEffect(() => {
    let id = 0;
    const back = () => {
      document.documentElement.dataset.navBack = "";
      window.clearTimeout(id);
      id = window.setTimeout(() => delete document.documentElement.dataset.navBack, 1200);
    };
    window.addEventListener("popstate", back);
    return () => {
      window.removeEventListener("popstate", back);
      window.clearTimeout(id);
    };
  }, []);
  return null;
}
