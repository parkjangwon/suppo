import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const e2eDatabaseUrl = `file:${path.resolve(__dirname, "packages/db/dev.db")}`;

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
  webServer: [
    {
      command: `DATABASE_URL='${e2eDatabaseUrl}' pnpm --filter=@crinity/public dev`,
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `DATABASE_URL='${e2eDatabaseUrl}' pnpm --filter=@crinity/admin dev`,
      url: "http://127.0.0.1:3001/admin/login",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
