import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    // Integration tests share a single Postgres database and clean it
    // between cases, so test files must not run concurrently.
    fileParallelism: false,
  },
});
