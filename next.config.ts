import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A second dev server (the gauntlet's) can run beside the team's with its
  // own build folder: ANOMALY_DIST_DIR=.next-gauntlet next dev -p 3200.
  distDir: process.env.ANOMALY_DIST_DIR || ".next",
  cacheComponents: true,
  // The floating dev badge sits on top of the ANOMALY wordmark.
  devIndicators: false,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
