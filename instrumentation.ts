/*
 * Runs once when the server starts, before it handles a request: validates
 * every key (lib/env.ts) so a malformed one stops the server here instead of
 * failing on a student's first question (CLAUDE.md §7.5).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { missingKeys } = await import("./lib/env");
  const missing = missingKeys();
  if (missing.length > 0) {
    // Names only, never values.
    console.warn(`[anomaly] Running with written fallbacks; not set: ${missing.join(", ")}`);
  }
}
