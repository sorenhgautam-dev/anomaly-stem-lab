import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // The guard throws outside Next.js; server modules are tested directly.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "tests/**/*.eval.ts"],
    exclude: ["node_modules/**", ".next/**", "tests/e2e/**"],
    passWithNoTests: true,
  },
});
