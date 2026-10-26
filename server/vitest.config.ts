import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Tests never touch the network or Mongo: every adapter, LLM, and store is
    // injected. If a test needs a real socket it is a spike, not a unit test.
    pool: "forks",
    reporters: "default",
  },
});
