import { test, expect } from "@playwright/test";

test("admin login and public routes render different shells", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByText("상담원 로그인")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Crinity Support").first()).toBeVisible();
});
