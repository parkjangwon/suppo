import { test, expect } from "@playwright/test";

test.describe("Admin Ticket Workflow", () => {
  test("admin sees paginated ticket list with filters", async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          user: {
            id: "admin-1",
            name: "Admin User",
            email: "admin@example.com",
            role: "ADMIN",
          },
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        },
      });
    });

    await page.goto("/admin/tickets");
    await expect(page.getByLabel("상태 필터")).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("agent can add internal note to assigned ticket", async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          user: {
            id: "agent-1",
            name: "Agent User",
            email: "agent@example.com",
            role: "AGENT",
          },
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        },
      });
    });

    await page.route("**/api/tickets/ticket-1", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          id: "ticket-1",
          ticketNumber: "CRN-1234",
          subject: "Test Ticket",
          status: "OPEN",
          priority: "MEDIUM",
          assigneeId: "agent-1",
          customerName: "Test Customer",
          customerEmail: "customer@example.com",
          createdAt: new Date().toISOString(),
          comments: [],
          activities: [],
        },
      });
    });

    await page.goto("/admin/tickets/ticket-1");
    await page.getByLabel("응답 작성").fill("내부 메모 내용");
    await page.getByLabel("내부 메모로 저장").check();
    
    await page.route("**/api/comments", async (route) => {
      await route.fulfill({
        status: 201,
        json: {
          id: "comment-1",
          content: "내부 메모 내용",
          isInternal: true,
          authorName: "Agent User",
          createdAt: new Date().toISOString(),
        },
      });
    });

    await page.getByRole("button", { name: "전송" }).click();
    await expect(page.getByText("내부 메모 내용")).toBeVisible();
  });
});
