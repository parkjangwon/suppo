// tests/e2e/specs/05-admin-ticket-list.spec.ts
import { test, expect } from "@playwright/test";
import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

const TEST_TICKETS: string[] = [];

test.beforeAll(async () => {
  await seedAdmin();
  const rt = await seedRequestType();

  const t1 = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-E2E-LIST-OPEN-${Date.now()}`,
      customerName: "목록 테스트 고객1",
      customerEmail: "e2e-list1@crinity-test.io",
      subject: "[E2E] 목록 테스트 OPEN 티켓",
      description: "목록 필터 테스트용",
      priority: "MEDIUM",
      status: "OPEN",
      requestTypeId: rt.id,
    },
  });
  const t2 = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-E2E-LIST-IP-${Date.now()}`,
      customerName: "목록 테스트 고객2",
      customerEmail: "e2e-list2@crinity-test.io",
      subject: "[E2E] 목록 테스트 IN_PROGRESS 티켓",
      description: "목록 필터 테스트용",
      priority: "HIGH",
      status: "IN_PROGRESS",
      requestTypeId: rt.id,
    },
  });
  TEST_TICKETS.push(t1.ticketNumber, t2.ticketNumber);
});

test.afterAll(async () => {
  for (const tn of TEST_TICKETS) await cleanupTicket(tn);
  await prisma.$disconnect();
});

test("관리자 세션으로 티켓 목록 페이지에 접근하고 필터를 사용한다", async ({ page }, testInfo) => {
  await test.step("관리자 로그인", async () => {
    await page.goto("/admin/login");
    await page.getByLabel("이메일").fill("admin@crinity.io");
    await page.getByLabel("비밀번호").fill("wkddnjs1!");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
    await captureStep(page, testInfo, "관리자 로그인");
  });

  await test.step("티켓 목록 페이지 접근", async () => {
    await page.goto("/admin/tickets");
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });
    await captureStep(page, testInfo, "티켓 목록 페이지 접근");
  });

  await test.step("상태 필터 적용 (OPEN)", async () => {
    await page.getByLabel("상태 필터").click();
    await page.getByRole("option", { name: "열림 (OPEN)" }).click();
    await page.waitForTimeout(500);
    await captureStep(page, testInfo, "상태 필터 적용 (OPEN)");
  });

  await test.step("필터 초기화", async () => {
    await page.getByLabel("상태 필터").click();
    await page.getByRole("option", { name: "모든 상태" }).click();
    await page.waitForTimeout(500);
    await captureStep(page, testInfo, "필터 초기화");
  });
});
