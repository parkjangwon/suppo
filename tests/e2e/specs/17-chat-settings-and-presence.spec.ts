import { test, expect } from "@playwright/test";
import { prisma, seedAdmin } from "../fixtures/db";

test.beforeAll(async () => {
  await seedAdmin();
  await prisma.chatWidgetSettings.upsert({
    where: { id: "default" },
    update: {
      enabled: true,
      buttonLabel: "채팅 상담",
      buttonImageUrl: null,
      welcomeTitle: "실시간 채팅 상담",
    },
    create: {
      id: "default",
      widgetKey: "crinity-chat-widget",
      enabled: true,
      buttonLabel: "채팅 상담",
      buttonImageUrl: null,
      welcomeTitle: "실시간 채팅 상담",
    },
  });
});

test.afterAll(async () => {
  await prisma.chatConversation.deleteMany({
    where: {
      ticket: {
        customerEmail: "chat-presence-e2e@crinity-test.io",
      },
    },
  });
  await prisma.ticket.deleteMany({
    where: {
      customerEmail: "chat-presence-e2e@crinity-test.io",
    },
  });
  await prisma.$disconnect();
});

test("채팅 위젯 설정이 SDK에 반영되고 타이핑/읽음 상태가 표시된다", async ({ browser, page }) => {
  await page.goto("http://127.0.0.1:3001/admin/login");
  await page.getByLabel("이메일").fill("admin@crinity.io");
  await page.getByLabel("비밀번호").fill("admin1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

  await page.goto("http://127.0.0.1:3001/admin/settings/chat");
  await expect(page.getByLabel("위젯 버튼 라벨")).not.toHaveValue("", { timeout: 10000 });
  await page.getByLabel("위젯 버튼 라벨").fill("실시간 문의");
  await page.getByLabel("위젯 환영 제목").fill("지금 바로 상담해보세요");
  const settingsResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/chat/widget-settings") &&
      response.request().method() === "PATCH",
    { timeout: 10000 }
  );
  await page.getByRole("button", { name: "위젯 설정 저장" }).click();
  await expect((await settingsResponse).ok()).toBeTruthy();

  const hostPage = await browser.newPage();
  await hostPage.goto("http://127.0.0.1:3000/");
  await hostPage.evaluate(() => localStorage.clear());
  await hostPage.reload();

  const launcher = hostPage.locator("#crinity-chat-launcher");
  await expect(launcher).toHaveText("실시간 문의");

  const popupPromise = hostPage.context().waitForEvent("page");
  await launcher.click();
  const customerPage = await popupPromise;
  await customerPage.waitForLoadState("domcontentloaded");
  await customerPage.evaluate(() => localStorage.clear());
  await customerPage.reload();

  await expect(customerPage.getByText("지금 바로 상담해보세요")).toBeVisible({ timeout: 10000 });
  await customerPage.getByLabel("이름").fill("상태 고객");
  await customerPage.getByLabel("이메일").fill("chat-presence-e2e@crinity-test.io");
  await customerPage.getByLabel("메시지").fill("읽음/타이핑 상태 테스트");
  await customerPage.getByRole("button", { name: "채팅 시작" }).click();

  const adminPage = await browser.newPage();
  await adminPage.goto("http://127.0.0.1:3001/admin/login");
  await adminPage.getByLabel("이메일").fill("admin@crinity.io");
  await adminPage.getByLabel("비밀번호").fill("admin1234");
  await adminPage.getByRole("button", { name: "로그인" }).click();
  await expect(adminPage).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
  await adminPage.goto("http://127.0.0.1:3001/admin/chats");
  await expect
    .poll(async () => {
      await adminPage.reload();
      return await adminPage.locator("body").textContent();
    }, { timeout: 10000 })
    .toContain("상태 고객");

  await adminPage.getByRole("link", { name: /상태 고객/ }).click();
  await adminPage.getByLabel("응답 작성").fill("답장을 입력하는 중입니다");
  await expect(customerPage.getByText("상담원이 입력 중...")).toBeVisible({ timeout: 10000 });

  await adminPage.getByRole("button", { name: "전송" }).click();
  await expect(customerPage.getByText("답장을 입력하는 중입니다")).toBeVisible({ timeout: 10000 });
  await expect
    .poll(async () => {
      await adminPage.reload();
      return await adminPage.locator("body").textContent();
    }, { timeout: 10000 })
    .toContain("고객이 마지막 메시지를 읽음");
});
