import { expect, test } from "@playwright/test";

test("agent can sign in with credentials and reach dashboard", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("이메일").fill("admin@crinity.io");
  await page.getByLabel("비밀번호").fill("admin123");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
});

test("shows error for invalid credentials", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("이메일").fill("wrong@example.com");
  await page.getByLabel("비밀번호").fill("wrongpass");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByText("로그인에 실패했습니다")).toBeVisible();
});
