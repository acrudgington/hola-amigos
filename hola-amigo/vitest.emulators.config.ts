// Tests that need the Firebase emulators (Java required). Run: npm run test:emulators
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests-emulator/**/*.test.ts"],
    environment: "node",
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
