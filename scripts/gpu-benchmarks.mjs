// Copies detect-gpu's benchmark tables into public/gpu-benchmarks so the
// quality tier is picked without fetching anything from a CDN at runtime
// (lib/quality.ts). Runs before dev and build (see package.json).
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const from = join(root, "node_modules", "detect-gpu", "dist", "benchmarks");
const to = join(root, "public", "gpu-benchmarks");
if (existsSync(from)) cpSync(from, to, { recursive: true });
