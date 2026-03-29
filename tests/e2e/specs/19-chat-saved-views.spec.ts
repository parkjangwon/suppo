import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { prisma, seedAdmin } from "../fixtures/db";

let waitingConversationId: string;
let customerWaitingConversationId: string;
let waitingTicketId: string;
let customerWaitingTicketId: string;

test.beforeAll(async () => {
  const admin = await seedAdmin();
  const requestType = await prisma.requestType.upsert({
    where: { name: "실시간 채팅" },
    update: { channel: "IN_APP", isActive: true },
    create: {
      name: "실시간 채팅",
      channel: "IN_APP",
      isActive: true,
      sortOrder: 999,
    },
  });

  const oldTime = new Date(Date.now() - 20 * 60 * 1000);

  const waitingTicket = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-CHAT-VIEW-A-${Date.now()}`,
      customerName: "대기 고객 A",
      customerEmail: "chat-view-a@crinity-test.io",
      subject: "상담원 대기 채팅",
      description: "상담원 대기 채팅",
      priority: "MEDIUM",
      status: "OPEN",
      assigneeId: admin.id,
      requestTypeId: requestType.id,
      source: "IN_APP",
      createdAt: oldTime,
      updatedAt: oldTime,
    },
  });
  waitingTicketId = waitingTicket.id;

  await prisma.comment.create({
    data: {
      ticketId: waitingTicket.id,
      authorType: "CUSTOMER",
      authorName: "대기 고객 A",
      authorEmail: "chat-view-a@crinity-test.io",
      content: "상담원 대기 채팅",
      createdAt: oldTime,
      updatedAt: oldTime,
    },
  });

  const waitingConversation = await prisma.chatConversation.create({
    data: {
      ticketId: waitingTicket.id,
      widgetKey: "crinity-chat-widget",
      customerTokenHash: createHash("sha256").update(`chat-view-a-${Date.now()}`).digest("hex"),
      status: "WAITING_AGENT",
      startedAt: oldTime,
      lastMessageAt: oldTime,
      lastCustomerMessageAt: oldTime,
      createdAt: oldTime,
      updatedAt: oldTime,
    },
  });
  waitingConversationId = waitingConversation.id;

  const customerWaitingTicket = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-CHAT-VIEW-B-${Date.now()}`,
      customerName: "대기 고객 B",
      customerEmail: "chat-view-b@crinity-test.io",
      subject: "고객 대기 채팅",
      description: "고객 대기 채팅",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      assigneeId: admin.id,
      requestTypeId: requestType.id,
      source: "IN_APP",
    },
  });
  customerWaitingTicketId = customerWaitingTicket.id;

  await prisma.comment.createMany({
    data: [
      {
        ticketId: customerWaitingTicket.id,
        authorType: "CUSTOMER",
        authorName: "대기 고객 B",
        authorEmail: "chat-view-b@crinity-test.io",
        content: "고객 대기 채팅",
      },
      {
        ticketId: customerWaitingTicket.id,
        authorType: "AGENT",
        authorId: admin.id,
        authorName: "Admin",
        authorEmail: "admin@crinity.io",
        content: "응답 완료",
      },
    ],
  });

  const customerWaitingConversation = await prisma.chatConversation.create({
    data: {
      ticketId: customerWaitingTicket.id,
      widgetKey: "crinity-chat-widget",
      customerTokenHash: createHash("sha256").update(`chat-view-b-${Date.now()}`).digest("hex"),
      status: "WAITING_CUSTOMER",
      startedAt: new Date(),
      lastMessageAt: new Date(),
      lastCustomerMessageAt: new Date(Date.now() - 10 * 60 * 1000),
      lastAgentMessageAt: new Date(Date.now() - 5 * 60 * 1000),
    },
  });
  customerWaitingConversationId = customerWaitingConversation.id;
});

test.afterAll(async () => {
  await prisma.chatConversation.deleteMany({ where: { id: { in: [waitingConversationId, customerWaitingConversationId] } } });
  await prisma.ticket.deleteMany({ where: { id: { in: [waitingTicketId, customerWaitingTicketId] } } });
  await prisma.savedFilter.deleteMany({ where: { name: "상담원 대기 보기" } });
  await prisma.$disconnect();
});

test("채팅 저장 보기를 저장하고 다시 적용할 수 있다", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/admin/login");
  await page.getByLabel("이메일").fill("admin@crinity.io");
  await page.getByLabel("비밀번호").fill("admin1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

  await page.goto("http://127.0.0.1:3001/admin/chats");
  await page.getByLabel("채팅 상태 필터").click();
  await page.getByRole("option", { name: "상담원 대기" }).click();
  await expect(page.getByText("대기 고객 A")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "저장 보기" }).click();
  await page.getByText("현재 보기 저장").click();
  await page.getByLabel("채팅 보기 이름").fill("상담원 대기 보기");
  await page.getByRole("button", { name: "저장", exact: true }).click();

  await page.getByLabel("채팅 상태 필터").click();
  await page.getByRole("option", { name: "고객 대기" }).click();
  await expect(page.getByText("대기 고객 B")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "저장 보기" }).click();
  await page.getByText("상담원 대기 보기").click();
  await expect(page.getByText("대기 고객 A")).toBeVisible({ timeout: 10000 });
});
