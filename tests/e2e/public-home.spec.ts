import { test, expect } from "@playwright/test";

test("public landing shows create and lookup actions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "티켓 작성" })).toBeVisible();
  await expect(page.getByRole("link", { name: "티켓 조회" })).toBeVisible();
});
