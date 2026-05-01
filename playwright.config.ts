import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const e2eDatabaseUrl =
  process.env.DATABASE_URL ?? "postgresql://suppo:suppo_dev@localhost:5432/suppo";

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
      command: `cd packages/db && DATABASE_URL='${e2eDatabaseUrl}' pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma && cd ../.. && DATABASE_URL='${e2eDatabaseUrl}' pnpm --filter=@suppo/public dev`,
      url: "http://127.0.0.1:3000",
      reuseExistingServer: false,
    },
    {
      command: `DATABASE_URL='${e2eDatabaseUrl}' INTERNAL_AUTOMATION_DISPATCH_TOKEN='e2e-automation-token' pnpm --filter=@suppo/admin dev`,
      url: "http://127.0.0.1:3001/admin/login",
      reuseExistingServer: false,
    },
  ],
});
