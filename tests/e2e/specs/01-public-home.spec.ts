// tests/e2e/specs/01-public-home.spec.ts
import { test, expect } from "@playwright/test";
import { captureStep } from "../fixtures/screenshot";

test("공개 홈페이지 렌더링 확인", async ({ page }, testInfo) => {
  await test.step("홈 페이지 접근", async () => {
    await page.goto("/");
    await expect(page.getByText("Crinity Helpdesk").first()).toBeVisible();
    await captureStep(page, testInfo, "홈 페이지 접근");
  });

  await test.step("새 티켓 제출 링크 확인", async () => {
    await expect(page.getByRole("link", { name: "티켓 작성" })).toBeVisible();
    await captureStep(page, testInfo, "새 티켓 제출 링크 확인");
  });
});
