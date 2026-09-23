import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

// Deliberately separate from vite.config.ts: unit tests run plain modules and
// do not need the TanStack Start, Tailwind or React Compiler plugins.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Node by default. A test that renders UI opts into a DOM environment with
    // an `// @vitest-environment jsdom` comment and pulls jsdom in as a dev
    // dependency at that point.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
})
