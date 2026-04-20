// tests/e2e/specs/07-ticket-presence.spec.ts
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
      ticketNumber: `CRN-E2E-PRESENCE-${Date.now()}`,
      customerName: "Presence 테스트 고객",
      customerEmail: "e2e-presence@suppo-test.io",
      subject: "[E2E] 티켓 조회 상태 테스트",
      description: "다른 상담원이 조회 중일 때 표시되는지 테스트합니다.",
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
  await prisma.ticketPresence.deleteMany({ where: { ticketId } });
  await prisma.$disconnect();
});

test("다른 상담원이 티켓을 조회 중일 때 표시된다", async ({ page, context }, testInfo) => {
  await test.step("첫 번째 상담원(admin) 로그인", async () => {
    await page.goto("http://127.0.0.1:3001/admin/login");
    await page.getByLabel("이메일").fill("admin@suppo.io");
    await page.getByLabel("비밀번호").fill("admin1234");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
  });

  await test.step("두 번째 상담원(에이전트) 생성 및 로그인", async () => {
    const agent = await prisma.agent.create({
      data: {
        name: "Test Agent",
        email: `agent-${Date.now()}@suppo-test.io`,
        passwordHash: await require("bcryptjs").hash("password123!", 10),
        role: "AGENT",
        isActive: true,
      },
    });

    // 새로운 브라우저 컨텍스트로 두 번째 상담원 로그인
    const agentContext = await context.browser()?.newContext();
    const agentPage = await agentContext?.newPage();
    if (!agentPage) throw new Error("Failed to create agent page");

    await agentPage.goto("http://127.0.0.1:3001/admin/login");
    await agentPage.getByLabel("이메일").fill(agent.email);
    await agentPage.getByLabel("비밀번호").fill("password123!");
    await agentPage.getByRole("button", { name: "로그인" }).click();
    await expect(agentPage).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

    // 두 번째 상담원이 티켓 상세 페이지 접근
    await agentPage.goto(`http://127.0.0.1:3001/admin/tickets/${ticketId}`);
    await expect(agentPage.getByText(ticketNumber)).toBeVisible({ timeout: 10000 });

    // 폴리핑 대기 (presence 등록될 때까지)
    await agentPage.waitForTimeout(2000);

    await captureStep(agentPage, testInfo, "두번째-상담원-티켓-조회");

    // 첫 번째 상담원(admin) 페이지에서 확인
    await page.goto(`http://127.0.0.1:3001/admin/tickets/${ticketId}`);
    await page.waitForTimeout(2000);

    // "Test Agent 상담원이 확인 중" 메시지 확인
    await expect(page.getByText(/상담원이 확인 중/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Test Agent")).toBeVisible();

    await captureStep(page, testInfo, "조회중-표시-확인");

    // 정리
    await agentContext?.close();
    await prisma.agent.delete({ where: { id: agent.id } });
  });
});

test("페이지 이탈 시 presence가 제거된다", async ({ page }, testInfo) => {
  await test.step("상담원 로그인 및 티켓 접근", async () => {
    await page.goto("http://127.0.0.1:3001/admin/login");
    await page.getByLabel("이메일").fill("admin@suppo.io");
    await page.getByLabel("비밀번호").fill("admin1234");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

    await page.goto(`http://127.0.0.1:3001/admin/tickets/${ticketId}`);
    await expect(page.getByText(ticketNumber)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // DB에 presence 존재 확인
    const presence = await prisma.ticketPresence.findFirst({
      where: { ticketId },
    });
    expect(presence).not.toBeNull();
  });

  await test.step("페이지 이탈 후 presence 제거", async () => {
    const browserContext = page.context();

    // 페이지 닫기 (presence 제거 트리거 - beforeunload 이벤트)
    await page.close();
    const nextPage = await browserContext.newPage();
    await nextPage.waitForTimeout(1000);

    // DB에서 presence 삭제 확인 (cleanup은 beforeunload에서 비동기로 실행되므로 잠시 대기)
    await nextPage.waitForTimeout(2000);
    const presence = await prisma.ticketPresence.findFirst({
      where: { ticketId },
    });
    expect(presence).toBeNull();

    await captureStep(nextPage, testInfo, "presence-제거-확인");
  });
});
