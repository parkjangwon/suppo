import { test, expect } from "@playwright/test";
import { seedAdmin, prisma } from "../fixtures/db";

test.beforeAll(async () => {
  await seedAdmin();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("관리 콘솔 채팅 설정의 활성화 여부가 public 플로팅 채팅 버튼 노출에 반영된다", async ({
  browser,
}) => {
  const adminPage = await browser.newPage();
  const publicPage = await browser.newPage();

  await adminPage.goto("http://127.0.0.1:3001/admin/login");
  await adminPage.getByLabel("이메일").fill("admin@crinity.io");
  await adminPage.getByLabel("비밀번호").fill("admin1234");
  await adminPage.getByRole("button", { name: "로그인" }).click();
  await expect(adminPage).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

  await adminPage.goto("http://127.0.0.1:3001/admin/settings/chat");
  await expect(adminPage.getByLabel("플로팅 채팅 버튼 활성화")).toBeVisible({ timeout: 10000 });

  const toggle = adminPage.getByLabel("플로팅 채팅 버튼 활성화");
  if (!(await toggle.isChecked())) {
    await toggle.click();
  }
  await adminPage.getByRole("button", { name: "위젯 설정 저장" }).click();

  await publicPage.goto("http://127.0.0.1:3000/");
  await expect(publicPage.locator("#crinity-chat-launcher")).toBeVisible({ timeout: 10000 });

  await adminPage.goto("http://127.0.0.1:3001/admin/settings/chat");
  const disableToggle = adminPage.getByLabel("플로팅 채팅 버튼 활성화");
  if (await disableToggle.isChecked()) {
    await disableToggle.click();
  }
  await adminPage.getByRole("button", { name: "위젯 설정 저장" }).click();

  await publicPage.reload();
  await expect(publicPage.locator("#crinity-chat-launcher")).toHaveCount(0);
});
