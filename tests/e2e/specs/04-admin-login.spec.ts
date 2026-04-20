// tests/e2e/specs/04-admin-login.spec.ts
import { test, expect } from "@playwright/test";
import { seedAdmin, prisma } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

test.beforeAll(async () => {
  await seedAdmin();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("관리자가 올바른 자격증명으로 로그인하여 대시보드에 진입한다", async ({ page }, testInfo) => {
  await test.step("로그인 페이지 접근", async () => {
    await page.goto("http://127.0.0.1:3001/admin/login");
    await expect(page.getByText("관리 콘솔")).toBeVisible();
    await captureStep(page, testInfo, "로그인 페이지 접근");
  });

  await test.step("자격증명 입력", async () => {
    await page.getByLabel("이메일").fill("admin@suppo.io");
    await page.getByLabel("비밀번호").fill("admin1234");
    await captureStep(page, testInfo, "자격증명 입력");
  });

  await test.step("로그인 후 대시보드 이동", async () => {
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
    await captureStep(page, testInfo, "로그인 후 대시보드 이동");
  });
});

test("잘못된 자격증명으로 로그인 시 오류 메시지가 표시된다", async ({ page }, testInfo) => {
  await test.step("로그인 페이지 접근", async () => {
    await page.goto("http://127.0.0.1:3001/admin/login");
    await captureStep(page, testInfo, "로그인 페이지 접근");
  });

  await test.step("잘못된 자격증명 입력 및 제출", async () => {
    await page.getByLabel("이메일").fill("wrong@example.com");
    await page.getByLabel("비밀번호").fill("wrongpassword");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page.getByText("로그인에 실패했습니다")).toBeVisible({ timeout: 5000 });
    await captureStep(page, testInfo, "잘못된 자격증명 입력 및 제출");
  });
});
