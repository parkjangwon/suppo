import path from "node:path";

import { test, expect } from "@playwright/test";
import { prisma, seedAdmin } from "../fixtures/db";

test.beforeAll(async () => {
  await seedAdmin();
});

test.afterAll(async () => {
  await prisma.chatConversation.deleteMany({
    where: {
      ticket: {
        customerEmail: "chat-widget-e2e@crinity-test.io",
      },
    },
  });
  await prisma.ticket.deleteMany({
    where: {
      customerEmail: "chat-widget-e2e@crinity-test.io",
    },
  });
  await prisma.$disconnect();
});

test("고객 위젯 채팅이 관리자 채팅 큐와 실시간으로 연결된다", async ({ browser }) => {
  const customerPage = await browser.newPage();
  const adminPage = await browser.newPage();

  await adminPage.goto("http://127.0.0.1:3001/admin/login");
  await adminPage.getByLabel("이메일").fill("admin@crinity.io");
  await adminPage.getByLabel("비밀번호").fill("admin1234");
  await adminPage.getByRole("button", { name: "로그인" }).click();
  await expect(adminPage).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

  await customerPage.goto("http://127.0.0.1:3000/chat/widget");
  await customerPage.evaluate(() => localStorage.clear());
  await customerPage.reload();
  await customerPage.getByLabel("이름").fill("채팅 고객");
  await customerPage.getByLabel("이메일").fill("chat-widget-e2e@crinity-test.io");
  await customerPage.getByLabel("메시지").fill("실시간 채팅이 잘 되나요?");
  await customerPage.getByRole("button", { name: "채팅 시작" }).click();

  await expect(customerPage.getByText("실시간 채팅이 잘 되나요?")).toBeVisible({ timeout: 10000 });

  await adminPage.goto("http://127.0.0.1:3001/admin/chats");
  await expect
    .poll(
      async () => {
        await adminPage.reload();
        return await adminPage.locator("body").textContent();
      },
      { timeout: 10000 }
    )
    .toContain("채팅 고객");
  await adminPage.getByRole("link", { name: /채팅 고객/ }).click();
  await expect(adminPage.getByText("실시간 채팅이 잘 되나요?")).toBeVisible({ timeout: 10000 });

  await adminPage.getByLabel("응답 작성").fill("네, 상담원이 바로 응답 중입니다.");
  await adminPage.getByRole("button", { name: "전송" }).click();

  await expect(customerPage.getByText("네, 상담원이 바로 응답 중입니다.")).toBeVisible({ timeout: 10000 });

  await customerPage.getByLabel("메시지").fill("로그 파일도 보낼게요.");
  await customerPage.getByLabel("첨부 파일").setInputFiles(path.resolve(process.cwd(), "tests/fixtures/chat-sample.txt"));
  await customerPage.getByRole("button", { name: "보내기" }).click();

  await expect
    .poll(
      async () => {
        await adminPage.reload();
        return await adminPage.locator("body").textContent();
      },
      { timeout: 10000 }
    )
    .toContain("로그 파일도 보낼게요.");
});
