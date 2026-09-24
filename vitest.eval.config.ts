import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["eval/**/*.{spec,test}.ts"],
    testTimeout: 150_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
})
