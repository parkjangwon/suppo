// tests/e2e/fixtures/screenshot.ts
import { Page, TestInfo } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.resolve("test-report/screenshots");

export async function captureStep(
  page: Page,
  testInfo: TestInfo,
  stepName: string
) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const safeName = stepName.replace(/[^a-zA-Z0-9가-힣]/g, "_").slice(0, 50);
  const filename = `${Date.now()}-${safeName}.png`;
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  await testInfo.attach(stepName, {
    path: filePath,
    contentType: "image/png",
  });
}
