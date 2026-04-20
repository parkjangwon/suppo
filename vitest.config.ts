import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/admin/src"),
      "@suppo/db": path.resolve(__dirname, "./packages/db/src/index.ts"),
      "@suppo/ui": path.resolve(__dirname, "./packages/ui/src"),
      "@suppo/shared": path.resolve(__dirname, "./packages/shared/src")
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: ["tests/unit/**/*.spec.ts"],
    exclude: [".worktrees/**", "tests/integration/**", "tests/e2e/**"]
  }
});
