import { createHash } from "node:crypto";

import { test, expect } from "@playwright/test";
import { prisma, seedAdmin } from "../fixtures/db";

let conversationId: string;
let ticketId: string;

test.beforeAll(async () => {
  const admin = await seedAdmin();

  const settings = await prisma.chatWidgetSettings.upsert({
    where: { id: "default" },
    update: {
      agentResponseTargetMinutes: 5,
    },
    create: {
      id: "default",
      widgetKey: "crinity-chat-widget",
      agentResponseTargetMinutes: 5,
      customerFollowupTargetMinutes: 30,
    },
  });

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

  const customer = await prisma.customer.upsert({
    where: { email: "chat-sla-e2e@crinity-test.io" },
    update: { name: "SLA 고객" },
    create: {
      email: "chat-sla-e2e@crinity-test.io",
      name: "SLA 고객",
      ticketCount: 1,
    },
  });

  const oldTime = new Date(Date.now() - 20 * 60 * 1000);

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-CHAT-SLA-${Date.now()}`,
      customerId: customer.id,
      customerName: "SLA 고객",
      customerEmail: "chat-sla-e2e@crinity-test.io",
      subject: "[E2E] SLA 경고 채팅",
      description: "상담원 응답이 지연된 채팅",
      priority: "MEDIUM",
      status: "OPEN",
      assigneeId: admin.id,
      requestTypeId: requestType.id,
      source: "IN_APP",
      createdAt: oldTime,
      updatedAt: oldTime,
    },
  });
  ticketId = ticket.id;

  await prisma.comment.create({
    data: {
      ticketId: ticket.id,
      authorType: "CUSTOMER",
      authorName: "SLA 고객",
      authorEmail: "chat-sla-e2e@crinity-test.io",
      content: "답변이 늦어요",
      createdAt: oldTime,
      updatedAt: oldTime,
    },
  });

  const conversation = await prisma.chatConversation.create({
    data: {
      ticketId: ticket.id,
      widgetKey: settings.widgetKey,
      customerTokenHash: createHash("sha256").update(`chat-sla-${Date.now()}`).digest("hex"),
      status: "WAITING_AGENT",
      startedAt: oldTime,
      lastMessageAt: oldTime,
      lastCustomerMessageAt: oldTime,
      createdAt: oldTime,
      updatedAt: oldTime,
    },
  });
  conversationId = conversation.id;
});

test.afterAll(async () => {
  await prisma.chatConversation.deleteMany({ where: { id: conversationId } });
  await prisma.ticket.deleteMany({ where: { id: ticketId } });
  await prisma.$disconnect();
});

test("채팅 큐와 분석 화면에 SLA 초과 대화가 표시된다", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/admin/login");
  await page.getByLabel("이메일").fill("admin@crinity.io");
  await page.getByLabel("비밀번호").fill("admin1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

  await page.goto("http://127.0.0.1:3001/admin/chats");
  await expect(page.getByText("SLA 초과").first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("SLA 고객")).toBeVisible({ timeout: 10000 });

  await page.getByRole("link", { name: "채팅 분석 보기" }).click();
  await expect(page.getByText("채팅 분석")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("SLA 위험 대화", { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("SLA 고객")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("상담원별 채팅 성과")).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("main").getByText("관리자").last()).toBeVisible({ timeout: 10000 });
});
