import { test, expect } from "@playwright/test";
import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

let ticketId: string;
let ticketNumber: string;
let teamLeadId: string;
let policyId: string;

test.beforeAll(async () => {
  await seedAdmin();
  const requestType = await seedRequestType();

  const teamLead = await prisma.agent.upsert({
    where: { email: "teamlead@suppo.io" },
    update: {
      name: "팀장",
      role: "TEAM_LEAD",
      isActive: true,
      maxTickets: 20,
    },
    create: {
      email: "teamlead@suppo.io",
      name: "팀장",
      role: "TEAM_LEAD",
      isActive: true,
      maxTickets: 20,
    },
  });
  teamLeadId = teamLead.id;

  const policy = await prisma.sLAPolicy.create({
    data: {
      name: "E2E 에스컬레이션 정책",
      priority: "HIGH",
      firstResponseHours: 1,
      resolutionHours: 8,
      isActive: true,
    },
  });
  policyId = policy.id;

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-E2E-SCHED-${Date.now()}`,
      customerName: "스케줄 자동화 고객",
      customerEmail: "scheduled-e2e@suppo-test.io",
      subject: "[E2E] SLA 위반 자동 에스컬레이션",
      description: "스케줄 자동화 테스트용 티켓입니다.",
      priority: "HIGH",
      status: "OPEN",
      requestTypeId: requestType.id,
    },
  });

  ticketId = ticket.id;
  ticketNumber = ticket.ticketNumber;

  await prisma.sLAClock.create({
    data: {
      ticketId,
      policyId,
      target: "RESOLUTION",
      status: "RUNNING",
      deadlineAt: new Date(Date.now() - 30 * 60 * 1000),
      breachedAt: new Date(Date.now() - 29 * 60 * 1000),
    },
  });
});

test.afterAll(async () => {
  await prisma.automationRule.deleteMany({
    where: {
      name: "E2E 스케줄 에스컬레이션",
    },
  });
  await prisma.sLAClock.deleteMany({ where: { ticketId } });
  await prisma.sLAPolicy.deleteMany({ where: { id: policyId } });
  await cleanupTicket(ticketNumber);
  await prisma.$disconnect();
});

test("관리자가 스케줄 자동화 규칙을 만들고 내부 디스패치로 SLA 위반 티켓을 에스컬레이션한다", async ({
  page,
}, testInfo) => {
  await test.step("관리자 로그인", async () => {
    await page.goto("http://127.0.0.1:3001/admin/login");
    await page.getByLabel("이메일").fill("admin@suppo.io");
    await page.getByLabel("비밀번호").fill("admin1234");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
    await captureStep(page, testInfo, "관리자 로그인");
  });

  await test.step("운영 정책 > 자동화 규칙에서 스케줄 규칙 생성", async () => {
    await page.goto("http://127.0.0.1:3001/admin/settings/operations");
    await page.getByRole("tab", { name: "자동 처리" }).click();
    await page.getByRole("button", { name: "규칙 추가" }).click();

    await page.getByLabel("규칙 이름").fill("E2E 스케줄 에스컬레이션");
    await page.getByLabel("트리거").click();
    await page.getByRole("option", { name: "스케줄 실행" }).click();

    await page.getByLabel("조건 상태").click();
    await page.getByRole("option", { name: "열림" }).click();

    await page.getByLabel("SLA 상태").click();
    await page.getByRole("option", { name: "위반" }).click();

    await page.getByLabel("우선순위 변경").click();
    await page.getByRole("option", { name: "긴급" }).click();

    await page.getByLabel("담당자 재배정").click();
    await page.getByRole("option", { name: "팀장" }).click();

    await page.getByLabel("추가 태그").fill("escalated:auto, sla:breached");
    await page.getByRole("button", { name: "저장" }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "저장" }).click();

    await expect(page.getByText("E2E 스케줄 에스컬레이션")).toBeVisible({ timeout: 10000 });
    await captureStep(page, testInfo, "스케줄 자동화 규칙 생성");
  });

  await test.step("내부 디스패치 실행", async () => {
    const response = await page.request.post("http://127.0.0.1:3001/api/internal/automation-dispatch", {
      headers: {
        "x-internal-token": "e2e-automation-token",
        "content-type": "application/json",
      },
      data: {},
    });

    expect(response.ok()).toBeTruthy();
    await captureStep(page, testInfo, "내부 디스패치 실행");
  });

  await test.step("DB에서 에스컬레이션 결과 확인", async () => {
    const updated = await prisma.ticket.findUnique({ where: { id: ticketId } });

    expect(updated?.priority).toBe("URGENT");
    expect(updated?.assigneeId).toBe(teamLeadId);
    expect(updated?.tags).toContain("escalated:auto");
    expect(updated?.tags).toContain("sla:breached");
  });
});
