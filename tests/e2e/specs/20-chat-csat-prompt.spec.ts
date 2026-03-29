import { test, expect } from "@playwright/test";
import { prisma, seedAdmin } from "../fixtures/db";

test.beforeAll(async () => {
  await seedAdmin();
});

test.afterAll(async () => {
  await prisma.chatConversation.deleteMany({
    where: {
      ticket: {
        customerEmail: "chat-csat-e2e@crinity-test.io",
      },
    },
  });
  await prisma.ticket.deleteMany({
    where: {
      customerEmail: "chat-csat-e2e@crinity-test.io",
    },
  });
  await prisma.customerSatisfaction.deleteMany({
    where: {
      customerEmail: "chat-csat-e2e@crinity-test.io",
    },
  });
  await prisma.$disconnect();
});

test("채팅이 종료되면 고객 위젯에 상담 평가 버튼이 표시된다", async ({ browser }) => {
  const adminPage = await browser.newPage();
  const customerPage = await browser.newPage();

  await adminPage.goto("http://127.0.0.1:3001/admin/login");
  await adminPage.getByLabel("이메일").fill("admin@crinity.io");
  await adminPage.getByLabel("비밀번호").fill("admin1234");
  await adminPage.getByRole("button", { name: "로그인" }).click();
  await expect(adminPage).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

  await customerPage.goto("http://127.0.0.1:3000/chat/widget");
  await customerPage.evaluate(() => localStorage.clear());
  await customerPage.reload();
  await customerPage.getByLabel("이름").fill("설문 고객");
  await customerPage.getByLabel("이메일").fill("chat-csat-e2e@crinity-test.io");
  await customerPage.getByLabel("메시지").fill("채팅 종료 후 설문 테스트");
  await customerPage.getByRole("button", { name: "채팅 시작" }).click();
  await expect(customerPage.getByText("채팅 종료 후 설문 테스트")).toBeVisible({ timeout: 10000 });

  await adminPage.goto("http://127.0.0.1:3001/admin/chats");
  await expect
    .poll(async () => {
      await adminPage.reload();
      return await adminPage.locator("body").textContent();
    }, { timeout: 10000 })
    .toContain("설문 고객");

  await adminPage.getByRole("link", { name: /설문 고객/ }).click();
  await adminPage.getByRole("combobox").filter({ hasText: "열림" }).click();
  await adminPage.getByRole("option", { name: "해결됨" }).click();

  await expect
    .poll(async () => {
      return await customerPage.locator("body").textContent();
    }, { timeout: 10000 })
    .toContain("상담 평가하기");
});
