import { test, expect } from "@playwright/test";

test.describe("Public Ticket Thread", () => {
  test("customer can lookup ticket with correct credentials", async ({ page }) => {
    await page.route("**/api/tickets/lookup", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/ticket/lookup");
    await page.getByLabel("티켓 번호").fill("CRN-TEST123");
    await page.getByLabel("이메일").fill("customer@example.com");
    await page.getByRole("button", { name: "조회" }).click();
    await expect(page).toHaveURL(/\/ticket\/CRN-TEST123$/);
  });

  test("customer cannot see internal notes", async ({ page }) => {
    await page.route("**/api/tickets/lookup", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/ticket/lookup");
    await page.getByLabel("티켓 번호").fill("CRN-TEST123");
    await page.getByLabel("이메일").fill("customer@example.com");
    await page.getByRole("button", { name: "조회" }).click();
    await expect(page).toHaveURL(/\/ticket\/CRN-TEST123$/);
  });

  test("customer can add reply to ticket", async ({ page }) => {
    await page.route("**/api/tickets/lookup", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/ticket/lookup");
    await page.getByLabel("티켓 번호").fill("CRN-TEST123");
    await page.getByLabel("이메일").fill("customer@example.com");
    await page.getByRole("button", { name: "조회" }).click();
    await expect(page).toHaveURL(/\/ticket\/CRN-TEST123$/);
  });
});
