// tests/e2e/specs/08-comment-lock.spec.ts
import { test, expect } from "@playwright/test";
import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

let ticketId: string;
let ticketNumber: string;

test.beforeAll(async () => {
  await seedAdmin();
  const rt = await seedRequestType();
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-E2E-LOCK-${Date.now()}`,
      customerName: "Lock 테스트 고객",
      customerEmail: "e2e-lock@crinity-test.io",
      subject: "[E2E] 댓글 락 테스트",
      description: "동시 편집 방지 기능 테스트입니다.",
      priority: "MEDIUM",
      status: "OPEN",
      requestTypeId: rt.id,
    },
  });
  ticketId = ticket.id;
  ticketNumber = ticket.ticketNumber;
});

test.afterAll(async () => {
  await cleanupTicket(ticketNumber);
  await prisma.ticketCommentLock.deleteMany({ where: { ticketId } });
  await prisma.$disconnect();
});

test("한 상담원이 댓글 작성 중일 때 다른 상담원은 편집할 수 없다", async ({ page, context }, testInfo) => {
  const agent = await prisma.agent.create({
    data: {
      name: "Lock Test Agent",
      email: `lock-agent-${Date.now()}@crinity-test.io`,
      passwordHash: await require("bcryptjs").hash("password123!", 10),
      role: "AGENT",
      isActive: true,
    },
  });

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { assigneeId: agent.id },
  });

  try {
    await test.step("첫 번째 상담원(admin) 로그인 및 댓글 작성 시작", async () => {
      await page.goto("http://127.0.0.1:3001/admin/login");
      await page.getByLabel("이메일").fill("admin@crinity.io");
      await page.getByLabel("비밀번호").fill("admin1234");
      await page.getByRole("button", { name: "로그인" }).click();
      await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

      await page.goto(`http://127.0.0.1:3001/admin/tickets/${ticketId}`);
      await expect(page.getByText(ticketNumber)).toBeVisible({ timeout: 10000 });

      // 댓글 textarea 포커스 (락 획득)
      await page.getByLabel("응답 작성").click();
      await page.getByLabel("응답 작성").fill("[E2E] 첫 번째 상담원이 작성 중...");
      await page.waitForTimeout(1500); // 락 획득 대기

      // 락 배너 확인
      await expect(page.getByText(/댓글 편집 중/)).toBeVisible();

      await captureStep(page, testInfo, "첫번째-상담원-락-획득");
    });

    await test.step("두 번째 상담원이 접근하면 락 메시지 표시", async () => {
      const agentContext = await context.browser()?.newContext();
      const agentPage = await agentContext?.newPage();
      if (!agentPage) throw new Error("Failed to create agent page");

      await agentPage.goto("http://127.0.0.1:3001/admin/login");
      await agentPage.getByLabel("이메일").fill(agent.email);
      await agentPage.getByLabel("비밀번호").fill("password123!");
      await agentPage.getByRole("button", { name: "로그인" }).click();
      await expect(agentPage).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

      await agentPage.goto(`http://127.0.0.1:3001/admin/tickets/${ticketId}`);
      await expect(agentPage.getByText(ticketNumber)).toBeVisible({ timeout: 10000 });

      // 두 번째 상담원이 textarea 클릭 시도
      await agentPage.getByLabel("응답 작성").click();
      await agentPage.waitForTimeout(1500);

      // 락 메시지 확인
      await expect(agentPage.getByText(/.*상담원이 댓글을 편집 중입니다/)).toBeVisible({ timeout: 5000 });

      // textarea 비활성화 확인
      await expect(agentPage.getByLabel("응답 작성")).toBeDisabled();

      await captureStep(agentPage, testInfo, "두번째-상담원-락-차단");

      await agentContext?.close();
    });
  } finally {
    await prisma.agent.delete({ where: { id: agent.id } }).catch(() => {});
  }
});

test("댓글 전송 후 락이 해제된다", async ({ page }, testInfo) => {
  await test.step("상담원 로그인 및 댓글 작성", async () => {
    await page.goto("http://127.0.0.1:3001/admin/login");
    await page.getByLabel("이메일").fill("admin@crinity.io");
    await page.getByLabel("비밀번호").fill("admin1234");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

    await page.goto(`http://127.0.0.1:3001/admin/tickets/${ticketId}`);
    await expect(page.getByText(ticketNumber)).toBeVisible({ timeout: 10000 });

    // 락 획득
    await page.getByLabel("응답 작성").click();
    await page.getByLabel("응답 작성").fill("[E2E] 댓글 전송 후 락 해제 테스트");
    await page.waitForTimeout(1500);

    // 락 존재 확인
    let lock = await prisma.ticketCommentLock.findUnique({ where: { ticketId } });
    expect(lock).not.toBeNull();

    // 댓글 전송
    await page.getByRole("button", { name: "전송" }).click();
    await page.waitForTimeout(2000);

    // 락 해제 확인
    lock = await prisma.ticketCommentLock.findUnique({ where: { ticketId } });
    expect(lock).toBeNull();

    await captureStep(page, testInfo, "락-해제-확인");
  });
});

test("락은 60초 후 만료된다", async ({ page }, testInfo) => {
  await test.step("락 수동 생성 및 만료 테스트", async () => {
    // 직접 DB에 만료된 락 생성
    const expiredLock = await prisma.ticketCommentLock.create({
      data: {
        ticketId,
        agentId: (await prisma.agent.findFirst({ where: { email: "admin@crinity.io" } }))!.id,
        expiresAt: new Date(Date.now() - 1000), // 이미 만료됨
      },
    });

    await page.goto("http://127.0.0.1:3001/admin/login");
    await page.getByLabel("이메일").fill("admin@crinity.io");
    await page.getByLabel("비밀번호").fill("admin1234");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

    await page.goto(`http://127.0.0.1:3001/admin/tickets/${ticketId}`);
    await expect(page.getByText(ticketNumber)).toBeVisible({ timeout: 10000 });

    // 만료된 락은 조회되지 않아야 함
    await page.waitForTimeout(2000);

    // 새로운 띭 획득 시도 (성공해야 함)
    await page.getByLabel("응답 작성").click();
    await page.waitForTimeout(1500);

    // 자신의 띭이 표시됨
    await expect(page.getByText(/댓글 편집 중/)).toBeVisible();

    await captureStep(page, testInfo, "만료된-띭-재획득");

    // 정리
    await prisma.ticketCommentLock.deleteMany({ where: { ticketId } });
  });
});
