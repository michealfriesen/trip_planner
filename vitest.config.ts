import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Set before workers start so they inherit it; planner tests depend on Italian wall-clock time.
process.env.TZ = "Europe/Rome";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The real package throws outside a React Server Components build.
      "server-only": fileURLToPath(new URL("./tests/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Stage 0 has no tests yet; stage 1 adds the first ones.
    passWithNoTests: true,
  },
});
