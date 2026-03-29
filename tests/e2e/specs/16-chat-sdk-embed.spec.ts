import { test, expect } from "@playwright/test";
import { prisma, seedAdmin } from "../fixtures/db";

test.beforeAll(async () => {
  await seedAdmin();
});

test.afterAll(async () => {
  await prisma.chatConversation.deleteMany({
    where: {
      ticket: {
        customerEmail: "sdk-chat-e2e@crinity-test.io",
      },
    },
  });
  await prisma.ticket.deleteMany({
    where: {
      customerEmail: "sdk-chat-e2e@crinity-test.io",
    },
  });
  await prisma.$disconnect();
});

test("JS SDK가 외부 페이지에 플로팅 버튼과 iframe 위젯을 삽입한다", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/chat/sdk-host");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const launcher = page.locator("#crinity-chat-launcher");
  await expect(launcher).toBeVisible({ timeout: 10000 });
  await expect(launcher).not.toHaveText("");

  const popupPromise = page.context().waitForEvent("page");
  await launcher.click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  await popup.evaluate(() => localStorage.clear());
  await popup.reload();

  await expect(popup.getByText("실시간 채팅 상담")).toBeVisible({ timeout: 10000 });

  await popup.getByLabel("이름").fill("SDK 고객");
  await popup.getByLabel("이메일").fill("sdk-chat-e2e@crinity-test.io");
  await popup.getByLabel("메시지").fill("SDK 플로팅 버튼 테스트");
  await popup.getByRole("button", { name: "채팅 시작" }).click();

  await expect(popup.getByText("SDK 플로팅 버튼 테스트")).toBeVisible({ timeout: 10000 });
});
