import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e/specs",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["html"],
    ["./tests/reporter/excel-reporter.ts"],
  ],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
